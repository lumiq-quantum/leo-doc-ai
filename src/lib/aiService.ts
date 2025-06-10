
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
        if (jsonChunk.content?.parts?.[0]?.text) {
          onChunkCallback({
            text: jsonChunk.content.parts[0].text,
            isPartial: jsonChunk.partial === true,
          });
        } else if (jsonChunk.partial === false && !jsonChunk.content?.parts?.[0]?.text) {
          // Handle cases where a final non-partial chunk might not have text (e.g. just metadata)
           onChunkCallback({ text: "", isPartial: false }); // Signal completion of text part
        }
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
        displayName: detail.filename, // Using filename from API response
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

    // Always add a text part, even if empty, if files are present and message is empty
    // The backend might require a text part.
    // If message is empty and files are present, use a default prompt or let it be empty based on API needs.
    // For now, we send the user's text as is. If it's empty, an empty text part might be sent.
    const textToSend = message.trim();
    if (textToSend || newMessageParts.length === 0) { // Send text if it exists, or if no files to ensure at least one part
         newMessageParts.push({ text: textToSend });
    }
    
    // If after all this, newMessageParts is still empty (e.g. empty text AND no files), it's an issue.
    if (newMessageParts.length === 0) {
      // This case should ideally not be reached if the send button is disabled correctly.
      // However, as a fallback, we could send a default empty text message.
      // For now, the existing logic with send button disablement should prevent this.
       console.warn("Attempting to send a message with no text or file parts. This might be an error.");
       // newMessageParts.push({ text: "" }); // Fallback if API requires a part
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
           const lines = buffer.split('\\n'); // SSE spec uses \n, \r, or \r\n. Robust parsing handles this.
           lines.forEach(line => processSseLine(line, onChunk));
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      // SSE messages are separated by double newlines, or single newlines if they are part of the same event.
      // We process line by line.
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
    onComplete(); // Ensure onComplete is called even on error to stop loading states
  }
}
