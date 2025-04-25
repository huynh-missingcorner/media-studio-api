import { Injectable } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StoredSpeechResponse } from '../types/chirp.types';
import { SpeechGenerationParams } from '../interfaces/generation-params.interface';

// Interface for types used in Google Cloud Text-to-Speech API
interface SynthesizeSpeechRequest {
  input: { text: string };
  voice: {
    languageCode: string;
    name: string;
    ssmlGender: 'NEUTRAL' | 'MALE' | 'FEMALE';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  };
}

@Injectable()
export class ChirpService {
  private client: TextToSpeechClient;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly storage: Storage,
  ) {
    this.client = new TextToSpeechClient();
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET_NAME', 'media-assets');
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const request: SynthesizeSpeechRequest = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Standard-C',
        ssmlGender: 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);
      if (!response.audioContent) {
        throw new Error('No audio content returned from the API');
      }
      return Buffer.from(response.audioContent as Buffer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to synthesize speech: ${errorMessage}`);
    }
  }

  async synthesizeAndStoreSpeech(params: SpeechGenerationParams): Promise<StoredSpeechResponse> {
    // Generate audio from text
    const audioBuffer = await this.synthesizeSpeech(params.text);

    // Generate a unique filename
    const filename = `${uuidv4()}.mp3`;
    const filePath = path.join('audio', filename);

    try {
      // Save the audio to Google Cloud Storage
      const file = this.storage.bucket(this.bucketName).file(filePath);
      await file.save(audioBuffer, {
        metadata: {
          contentType: 'audio/mp3',
        },
      });

      // Generate a signed URL for accessing the file
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        audioUrl: url,
        filePath,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store audio file: ${errorMessage}`);
    }
  }
}
