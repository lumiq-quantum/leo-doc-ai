
// API base URLs from the problem description
const API_BASE_URL_UPLOAD = 'http://127.0.0.1:8787';
const API_BASE_URL_CHAT = 'http://127.0.0.1:8000';

interface UploadedFileAPIResponse {
  // Assuming the API returns an object with these fields for a single uploaded file,
  // or an array of these if multiple files were supported by a single call.
  // Based on structure implied by "send a file to AI" example.
  // The file upload curl example output is not given, so this is an educated guess.
  // Let's assume it returns an array of objects, even for one file.
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
          // Content-Type for multipart/form-data is set by the browser
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`File upload failed: ${uploadResponse.status} ${errorText}`);
      }

      // Assuming API returns an array of file info objects
      const uploadResult: UploadedFileAPIResponse[] = await uploadResponse.json();
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error("File upload API did not return expected file information.");
      }
      // Use the first uploaded file's info
      uploadedFileInfo = {
        fileUri: uploadResult[0].fileUri,
        displayName: uploadResult[0].displayName || file.name, // Fallback to original file name
        mimeType: uploadResult[0].mimeType || file.type, // Fallback to original file type
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
    if (file) { // If there's a file
        // If user provided text along with the file, use it. Otherwise, use a default prompt.
        textToSend = (message && message !== `Uploaded: ${file.name}`) ? message.trim() : "Please analyze this document.";
    } else { // No file, just text
        textToSend = message.trim();
    }

    if (textToSend) {
        newMessageParts.push({ text: textToSend });
    }
    
    // API requires at least one part. If after processing, newMessageParts is empty, handle error or default.
    // Based on API spec, a text message or file message must exist.
    if (newMessageParts.length === 0) {
        // This case should ideally not happen if message or file is always present
        // or if textToSend always has content.
        // If it's only a file with no user text, textToSend defaults to "Please analyze this document."
        // If it's only text, textToSend is that text.
        // If somehow message is empty and no file, ChatInputBar should prevent this.
        // If after all this, parts are empty, it's an issue.
        throw new Error("Cannot send an empty message to the AI.");
    }


    const requestBody = {
      appName: "doc_agent",
      userId: "user", // Hardcoded as per API spec
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
        'accept': 'application/json', // API spec for run_sse
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
    let streamFinished = false;

    while (!streamFinished) {
      const { done, value } = await reader.read();
      if (done) {
        streamFinished = true;
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            try {
              const jsonChunk: SseChunk = JSON.parse(line);
              if (jsonChunk.content?.parts?.[0]?.text) {
                onChunk(jsonChunk.content.parts[0].text);
              }
            } catch (e) {
              console.warn("Error parsing final buffered JSON chunk:", e, line);
            }
          }
        }
        break; 
      }

      buffer += decoder.decode(value, { stream: true });
      let LFPosition;
      while ((LFPosition = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, LFPosition).trim();
        buffer = buffer.substring(LFPosition + 1);
        if (line) {
          try {
            const jsonChunk: SseChunk = JSON.parse(line);
            if (jsonChunk.content?.parts?.[0]?.text) {
              onChunk(jsonChunk.content.parts[0].text);
            }
            // The API spec does not explicitly state how to detect the *absolute end* of content
            // other than the stream closing (done = true).
            // The `partial: true` field might change, but we're not using it for completion detection.
          } catch (e) {
            console.warn("Error parsing JSON chunk from stream:", e, line);
            // Decide if this is a fatal error or ignorable. For now, log and continue.
          }
        }
      }
    }
    onComplete();

  } catch (err) {
    console.error("Error in streamChatResponse:", err);
    onError(err instanceof Error ? err : new Error('An unknown error occurred in AI service.'));
    onComplete(); // Ensure onComplete is called to clean up UI state (e.g. isSending)
  }
}
