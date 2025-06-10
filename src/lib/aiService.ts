
// API base URLs from the problem description
const API_BASE_URL_UPLOAD = 'http://127.0.0.1:8787';
const API_BASE_URL_CHAT = 'http://127.0.0.1:8000';

interface UploadedFileDetail {
  filename: string;
  uri: string;
  gemini_filename: string; // Not directly used in chat message parts yet, but good to have
  mime_type: string;
  size_bytes: number; // Not directly used yet
}

interface GeminiUploadApiResponse {
  uploaded_files: UploadedFileDetail[];
}

interface SseChunk {
  content?: {
    parts: Array<{
      text?: string;
      // fileData could also be in response, but we primarily care about text for now
    }>;
    role?: string;
  };
  partial?: boolean;
  // Other fields like usageMetadata, invocationId etc. are ignored for display
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
        }
      } catch (e) {
        console.warn("Error parsing JSON chunk from SSE line:", e, jsonData);
      }
    }
  } else if (trimmedLine && !trimmedLine.startsWith(":")) { // Ignore empty lines and comments
    console.warn("Received unexpected SSE line (ignoring):", trimmedLine);
  }
}

export async function streamChatResponse(
  message: string,
  file: File | undefined,
  sessionId: string,
  onChunk: (chunkData: { text: string; isPartial: boolean }) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  let uploadedFileInfo: { fileUri: string; displayName: string; mimeType: string } | null = null;

  try {
    // Step 1: Upload file if present
    if (file) {
      const formData = new FormData();
      formData.append('files', file, file.name);

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
        throw new Error("File upload API did not return expected file information.");
      }
      const firstFileDetail = uploadResult.uploaded_files[0];
      uploadedFileInfo = {
        fileUri: firstFileDetail.uri,
        displayName: firstFileDetail.filename || file.name,
        mimeType: firstFileDetail.mime_type || file.type,
      };
    }

    // Step 2: Construct message parts for SSE API
    const newMessageParts: any[] = [];
    if (uploadedFileInfo) {
      newMessageParts.push({
        fileData: {
          displayName: uploadedFileInfo.displayName,
          fileUri: uploadedFileInfo.fileUri,
          mimeType: uploadedFileInfo.mimeType,
        },
      });
    }

    let textToSend = "";
    if (file) {
      textToSend = (message && message !== `Uploaded: ${file.name}`) ? message.trim() : "Please analyze this document.";
    } else {
      textToSend = message.trim();
    }

    if (textToSend) {
      newMessageParts.push({ text: textToSend });
    }

    if (newMessageParts.length === 0) {
      // If only a file was uploaded and no default text, this could happen.
      // The API might still require a text part, even if empty or a placeholder.
      // For now, let's assume a text part is always good practice.
      // If the API truly allows no text part when a file is present, this check might be too strict.
      // However, current logic ensures "Please analyze this document." if message is empty with a file.
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
           const lines = buffer.split('\n');
           lines.forEach(line => processSseLine(line, onChunk));
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      while ((eolIndex = buffer.indexOf('\n')) >= 0) {
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

