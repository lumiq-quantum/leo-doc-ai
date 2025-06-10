
// API base URLs from the problem description
const API_BASE_URL_UPLOAD = 'http://127.0.0.1:8787';
const API_BASE_URL_CHAT = 'http://127.0.0.1:8000';

interface UploadedFileDetail {
  filename: string;
  uri: string;
  gemini_filename: string;
  mime_type: string;
  size_bytes: number;
}

interface GeminiUploadApiResponse {
  uploaded_files: UploadedFileDetail[];
}

interface SseChunk {
  content?: {
    parts: Array<{
      text?: string;
    }>;
    role?: string;
  };
  partial?: boolean;
}

interface TransformedUploadedFileInfo {
  fileUri: string;
  displayName: string;
  mimeType: string;
}

function processSseLine(
  line: string,
  onChunkCallback: (chunkData: { text: string; isPartial: boolean }) => void
) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith("data:")) {
    const jsonData = trimmedLine.substring("data:".length).trim();
    if (jsonData) {
      try {
        const jsonChunk: SseChunk = JSON.parse(jsonData);
        const textContent = jsonChunk.content?.parts?.[0]?.text;
        const isPartial = jsonChunk.partial === true; // Explicitly check if partial is true

        if (textContent !== undefined) {
          // If textContent exists (even if it's an empty string), process it
          onChunkCallback({
            text: textContent,
            isPartial: isPartial,
          });
        } else if (!isPartial) {
          // This is a final (not partial) chunk but has no text content.
          // This might signal the end of text streaming or just be metadata.
          // Call onChunkCallback to allow UI to update streaming status if needed.
          onChunkCallback({ text: "", isPartial: false });
        }
        // If it's partial and textContent is undefined, we can ignore it,
        // as there's no text to append, and a subsequent chunk should provide text or a final status.
      } catch (e) {
        console.warn("Error parsing JSON chunk from SSE line:", e, jsonData);
      }
    }
  } else if (trimmedLine && !trimmedLine.startsWith(":")) { 
    console.warn("Received unexpected SSE line (ignoring):", trimmedLine);
  }
}

export async function streamChatResponse(
  message: string, // User's typed text
  files: File[] | undefined, // Array of files
  sessionId: string,
  onChunk: (chunkData: { text: string; isPartial: boolean }) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  let uploadedFilesInfo: TransformedUploadedFileInfo[] = [];

  try {
    // Step 1: Upload files if present
    if (files && files.length > 0) {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file, file.name);
      });

      const uploadResponse = await fetch(`${API_BASE_URL_UPLOAD}/upload_to_gemini/`, {
        method: 'POST',
        body: formData,
        headers: {
          'accept': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`File upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult: GeminiUploadApiResponse = await uploadResponse.json();
      if (!uploadResult || !uploadResult.uploaded_files || uploadResult.uploaded_files.length === 0) {
        throw new Error("File upload API did not return expected file information for all files.");
      }
      
      uploadedFilesInfo = uploadResult.uploaded_files.map(detail => ({
        fileUri: detail.uri,
        displayName: detail.filename, 
        mimeType: detail.mime_type,
      }));
    }

    // Step 2: Construct message parts for SSE API
    const newMessageParts: any[] = [];
    
    if (uploadedFilesInfo.length > 0) {
      uploadedFilesInfo.forEach(info => {
        newMessageParts.push({
          fileData: {
            displayName: info.displayName,
            fileUri: info.fileUri,
            mimeType: info.mimeType,
          },
        });
      });
    }

    const textToSend = message.trim();
    if (textToSend || newMessageParts.length === 0) { 
         newMessageParts.push({ text: textToSend });
    }
    
    if (newMessageParts.length === 0) {
       console.warn("Attempting to send a message with no text or file parts. This might be an error.");
    }


    const requestBody = {
      appName: "doc_agent",
      userId: "user",
      sessionId: sessionId,
      newMessage: {
        role: "user",
        parts: newMessageParts,
      },
      streaming: true,
    };

    // Step 3: Call SSE API
    const sseResponse = await fetch(`${API_BASE_URL_CHAT}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!sseResponse.ok) {
      let errorBody = "Unknown error during SSE request";
      try {
        const errorData = await sseResponse.json();
        errorBody = errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        errorBody = `HTTP error ${sseResponse.status}: ${await sseResponse.text()}`;
      }
      throw new Error(`AI service request failed: ${errorBody}`);
    }

    if (!sseResponse.body) {
      throw new Error("SSE response body is null");
    }

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
           const lines = buffer.split('\\n'); 
           lines.forEach(line => processSseLine(line, onChunk));
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      while ((eolIndex = buffer.indexOf('\\n')) >= 0) {
        const line = buffer.substring(0, eolIndex);
        buffer = buffer.substring(eolIndex + 1);
        processSseLine(line, onChunk);
      }
    }
    onComplete();

  } catch (err) {
    console.error("Error in streamChatResponse:", err);
    onError(err instanceof Error ? err : new Error('An unknown error occurred in AI service.'));
    onComplete(); 
  }
}
