export interface ImageGenerationParams {
  prompt: string;
  sampleCount?: number;
  negativePrompt?: string;
  enhancePrompt?: boolean;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: string;
  storageUri?: string;
  referenceImages?: ReferenceImage[];
  modelId?: string;
}

export interface ImageUpscaleParams {
  gcsUri: string;
  upscaleFactor?: string;
  modelId?: string;
}

export interface ReferenceImage {
  referenceType: ReferenceType;
  referenceId: number;
  referenceImage: ReferenceImageConfig;
}

export interface SubjectReferenceImage extends ReferenceImage {
  subjectImageConfig: SubjectImageConfig;
}

export interface MaskReferenceImage extends ReferenceImage {
  maskImageConfig: MaskImageConfig;
}

export interface StyleReferenceImage extends ReferenceImage {
  styleImageConfig: StyleImageConfig;
}

export interface ControlReferenceImage extends ReferenceImage {
  controlImageConfig: ControlImageConfig;
}

export interface MaskImageConfig {
  maskMode: MaskMode;
}

export enum MaskMode {
  MASK_MODE_USER_PROVIDED = 'MASK_MODE_USER_PROVIDED', // User provided mask image
  MASK_MODE_BACKGROUND = 'MASK_MODE_BACKGROUND', // Generative mask image
  MASK_MODE_SEMANTIC = 'MASK_MODE_SEMANTIC', // Semantic mask image
}

export interface StyleImageConfig {
  styleDescription: string;
}

export interface ControlImageConfig {
  controlType: ControlType;
  enableControlImageComputation: boolean; // Whether to enable control image computation
}

export enum ControlType {
  CONTROL_TYPE_CANNY = 'CONTROL_TYPE_CANNY', // Canny edge control image
  CONTROL_TYPE_SCRIBBLE = 'CONTROL_TYPE_SCRIBBLE', // Scribble control image
}
export interface ReferenceImageConfig {
  gcsUri?: string;
  bytesBase64Encoded?: string;
}

export interface VideoGenerationParams {
  prompt: string;
  sampleCount?: number;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: string;
  frameRate?: number;
  durationSeconds?: number;
  storageUri?: string;
  image?: ReferenceImageConfig;
  modelId?: string;
}

export interface MusicGenerationParams {
  prompt: string;
  sampleCount?: number;
  duration?: number;
  sampleRate?: number;
  continuationDuration?: number;
  audioReference?: {
    bytesBase64Encoded: string;
    mimeType?: string;
  };
  storageUri?: string;
}

export interface SpeechGenerationParams {
  text: string;
  voice?: string;
  encoding?: 'MP3' | 'MULAW' | 'LINEAR16';
  sampleRate?: number;
  speed?: number;
  volume?: number;
  pitch?: number;
  language?: string;
}

export enum ReferenceType {
  REFERENCE_TYPE_SUBJECT = 'REFERENCE_TYPE_SUBJECT',
  REFERENCE_TYPE_RAW = 'REFERENCE_TYPE_RAW',
  REFERENCE_TYPE_MASK = 'REFERENCE_TYPE_MASK',
  REFERENCE_TYPE_STYLE = 'REFERENCE_TYPE_STYLE',
  REFERENCE_TYPE_CONTROL = 'REFERENCE_TYPE_CONTROL',
}

export enum SubjectType {
  SUBJECT_TYPE_DEFAULT = 'SUBJECT_TYPE_DEFAULT',
  SUBJECT_TYPE_PERSON = 'SUBJECT_TYPE_PERSON',
  SUBJECT_TYPE_PRODUCT = 'SUBJECT_TYPE_PRODUCT',
  SUBJECT_TYPE_ANIMAL = 'SUBJECT_TYPE_ANIMAL',
}

export interface SubjectImageConfig {
  subjectType: SubjectType;
  imageDescription: string;
}
