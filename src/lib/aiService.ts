
// API base URLs from the problem description
const API_BASE_URL_UPLOAD = 'http://127.0.0.1:8787';
const API_BASE_URL_CHAT = 'http://127.0.0.1:8000';

interface UploadedFileAPIResponse {
  fileUri: string;
  displayName: string;
  mimeType: string;
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

function processSseLine(line: string, onChunkCallback: (chunk: string) => void) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith("data:")) {
    const jsonData = trimmedLine.substring("data:".length).trim();
    if (jsonData) {
      try {
        const jsonChunk: SseChunk = JSON.parse(jsonData);
        if (jsonChunk.content?.parts?.[0]?.text) {
          onChunkCallback(jsonChunk.content.parts[0].text);
        }
      } catch (e) {
        console.warn("Error parsing JSON chunk from SSE line:", e, jsonData);
      }
    }
  } else if (trimmedLine && !trimmedLine.startsWith(":")) { // Ignore empty lines and comments (lines starting with ':')
    console.warn("Received unexpected SSE line (ignoring):", trimmedLine);
  }
}

export async function streamChatResponse(
  message: string,
  file: File | undefined,
  sessionId: string,
  onChunk: (chunk: string) => void,
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

      const uploadResult: UploadedFileAPIResponse[] = await uploadResponse.json();
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error("File upload API did not return expected file information.");
      }
      uploadedFileInfo = {
        fileUri: uploadResult[0].fileUri,
        displayName: uploadResult[0].displayName || file.name,
        mimeType: uploadResult[0].mimeType || file.type,
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
      throw new Error("Cannot send an empty message to the AI.");
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
        // Process any remaining data in buffer before completing
        if (buffer.trim()) {
          processSseLine(buffer, onChunk);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      // Process all complete lines in the buffer
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
    // Ensure onComplete is called in case of error to clean up UI state (e.g. isSending)
    // but only if it hasn't been called. If it's an error during streaming, onComplete might be premature.
    // However, the current structure calls onComplete() after the loop or in the catch block for other errors.
    // Let's ensure it is robustly called.
    // The `finally` block is not used here as onComplete/onError have specific timing needs.
    // If an error happens AFTER streaming starts and BEFORE onComplete is naturally called,
    // this onError then onComplete sequence is important.
    // If error happens during setup, onComplete might not be necessary if streaming hasn't started to affect UI.
    // For simplicity and robustness for the UI, calling onComplete is generally safe.
    onComplete(); 
  }
}
