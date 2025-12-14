import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class ElevenlabsService {
  private readonly base = 'https://api.elevenlabs.io/v1';

  async transcribe(buffer: Buffer, filename = 'audio.ogg') {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ElevenLabs API key not configured');

    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: this.getContentType(filename),
    });
    formData.append('model_id', 'scribe_v1');

    try {
      console.log('Transcribing audio with ElevenLabs...');

      const response = await axios.post<{ text: string }>(
        `${this.base}/speech-to-text`,
        formData,
        {
          headers: {
            'xi-api-key': apiKey,
            ...formData.getHeaders(),
          },
        },
      );

      console.log('ElevenLabs response status: ', response.status);
      console.log(
        'ElevenLabs response data: ',
        JSON.stringify(response.data, null, 2),
      );

      const text = response.data?.text || '';

      if (!text || text.trim() === '') {
        console.error('ElevenLabs transcription failed: Empty response');
        throw new Error('Transcription failed: Empty response from ElevenLabs');
      }

      return text as string;
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response?.data;
        const errorStatus = error.response?.status;
        console.error(
          'ElevenLabs API error: ',
          errorStatus,
          JSON.stringify(errorData),
        );
        throw new Error(
          `Transcription failed with status ${errorStatus}: ${JSON.stringify(errorData)}`,
        );
      }
      console.error('ElevenLabs transcription error: ', error);
      throw new Error(
        'Transcription failed: ' + (error?.message || 'Unknown error'),
      );
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      webm: 'audio/webm',
      m4a: 'audio/mp4',
    };
    return contentTypes[ext || ''] || 'audio/mpeg';
  }
}
