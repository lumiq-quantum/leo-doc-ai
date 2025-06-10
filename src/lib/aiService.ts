
import type { ChatMessage } from '@/types';

// Mock function to simulate AI streaming
export async function streamChatResponse(
  message: string,
  file: File | undefined,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate initial processing

    let responsePreamble = "Okay, I've processed your request. ";
    if (file) {
      responsePreamble += `Regarding the document "${file.name}" and your message: "${message}". `;
    } else {
      responsePreamble += `Regarding your message: "${message}". `;
    }
    
    const fullResponse = responsePreamble + "Here's a detailed explanation. The key points are as follows: First, we observe X. Second, Y seems to be the case. Finally, Z can be concluded. This analysis is based on the provided information and general knowledge. Further details can be elaborated if needed.";

    const words = fullResponse.split(/\s+/);
    let currentWordIndex = 0;

    const streamInterval = setInterval(() => {
      if (currentWordIndex < words.length) {
        let chunk = words[currentWordIndex];
        // Simulate variable chunk size slightly
        if (Math.random() > 0.7 && currentWordIndex + 1 < words.length) {
            chunk += " " + words[currentWordIndex+1];
            currentWordIndex++;
        }
        onChunk(chunk + " ");
        currentWordIndex++;
      } else {
        clearInterval(streamInterval);
        onComplete();
      }
    }, 70 + Math.random() * 80); // Simulate typing speed

  } catch (err) {
    console.error("AI service error:", err);
    onError(err instanceof Error ? err : new Error('Unknown AI service error'));
  }
}
