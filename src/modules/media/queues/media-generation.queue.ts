/**
 * Media generation queue name constant
 */
export const MEDIA_GENERATION_QUEUE = 'media-generation';

/**
 * Media generation job names
 */
export enum MediaGenerationJob {
  INITIATE_VIDEO_GENERATION = 'initiate-video-generation',
  POLL_VIDEO_GENERATION = 'poll-video-generation',
}
