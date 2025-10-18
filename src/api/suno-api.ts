import axios, { AxiosInstance, AxiosError } from 'axios';

export interface SunoApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface GenerateMusicRequest {
  prompt: string;
  customMode?: boolean;
  instrumental?: boolean;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  style?: string;
  title?: string;
  callBackUrl?: string;
}

export interface ExtendMusicRequest {
  audioId: string;
  defaultParamFlag?: boolean;
  prompt?: string;
  continueAt?: number;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  callBackUrl?: string;
}

export interface GenerateLyricsRequest {
  prompt: string;
  callBackUrl?: string;
}

export interface UploadAndCoverRequest {
  uploadUrl: string;
  customMode?: boolean;
  style?: string;
  title?: string;
  prompt?: string;
  callBackUrl?: string;
}

export interface ConvertToWavRequest {
  taskId: string;
  audioId: string;
  callBackUrl?: string;
}

export interface SeparateVocalsRequest {
  taskId: string;
  audioId: string;
  callBackUrl?: string;
}

export interface CreateMusicVideoRequest {
  taskId: string;
  audioId: string;
  author?: string;
  domainName?: string;
  callBackUrl?: string;
}

export interface SunoApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface TaskResponse {
  taskId: string;
}

export interface AudioTrack {
  id: string;
  audio_url: string;
  title: string;
  tags?: string;
  duration?: number;
  image_url?: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: 'GENERATING' | 'SUCCESS' | 'FAILED' | 'PENDING';
  response?: {
    data: AudioTrack[];
  };
  errorMessage?: string;
}

export interface CreditsResponse {
  credits: number;
}

export class SunoApi {
  private client: AxiosInstance;

  constructor(config: SunoApiConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.sunoapi.org/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate music from text description
   */
  async generateMusic(request: GenerateMusicRequest): Promise<string> {
    // Set default values for required fields
    const payload = {
      prompt: request.prompt,
      customMode: request.customMode ?? false,
      instrumental: request.instrumental ?? false,
      model: request.model ?? 'V5',
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback',
      ...(request.style && { style: request.style }),
      ...(request.title && { title: request.title })
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/generate', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Music generation failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Extend existing music
   */
  async extendMusic(request: ExtendMusicRequest): Promise<string> {
    // Set default values for required fields
    const payload = {
      audioId: request.audioId,
      defaultParamFlag: request.defaultParamFlag ?? true,
      model: request.model ?? 'V5',
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback',
      ...(request.prompt && { prompt: request.prompt }),
      ...(request.continueAt && { continueAt: request.continueAt })
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/generate/extend', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Music extension failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Generate lyrics from prompt
   */
  async generateLyrics(request: GenerateLyricsRequest): Promise<string> {
    const payload = {
      prompt: request.prompt,
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback'
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/lyrics', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Lyrics generation failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Upload and cover audio with new style
   */
  async uploadAndCover(request: UploadAndCoverRequest): Promise<string> {
    const payload = {
      uploadUrl: request.uploadUrl,
      customMode: request.customMode ?? false,
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback',
      ...(request.style && { style: request.style }),
      ...(request.title && { title: request.title }),
      ...(request.prompt && { prompt: request.prompt })
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/generate/upload-cover', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Upload and cover failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Convert audio to WAV format
   */
  async convertToWav(request: ConvertToWavRequest): Promise<string> {
    const payload = {
      taskId: request.taskId,
      audioId: request.audioId,
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback'
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/wav-format/generate', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`WAV conversion failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Separate vocals from music
   */
  async separateVocals(request: SeparateVocalsRequest): Promise<string> {
    const payload = {
      taskId: request.taskId,
      audioId: request.audioId,
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback'
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/vocal-removal/generate', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Vocal separation failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Create music video
   */
  async createMusicVideo(request: CreateMusicVideoRequest): Promise<string> {
    const payload = {
      taskId: request.taskId,
      audioId: request.audioId,
      callBackUrl: request.callBackUrl ?? 'https://example.com/callback',
      ...(request.author && { author: request.author }),
      ...(request.domainName && { domainName: request.domainName })
    };

    const response = await this.client.post<SunoApiResponse<TaskResponse>>('/music-video/generate', payload);
    
    if (response.data.code !== 200) {
      throw new Error(`Music video creation failed: ${response.data.msg}`);
    }
    
    return response.data.data.taskId;
  }

  /**
   * Get task status and results
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.client.get<SunoApiResponse<TaskStatusResponse>>(`/generate/record-info?taskId=${taskId}`);
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get task status: ${response.data.msg}`);
    }
    
    return response.data.data;
  }

  /**
   * Get remaining credits
   */
  async getRemainingCredits(): Promise<number> {
    const response = await this.client.get<SunoApiResponse<CreditsResponse>>('/get-credits');
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get credits: ${response.data.msg}`);
    }
    
    return response.data.data.credits;
  }

  /**
   * Get lyrics generation details
   */
  async getLyricsDetails(taskId: string): Promise<any> {
    const response = await this.client.get<SunoApiResponse<any>>(`/lyrics/record-info?taskId=${taskId}`);
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get lyrics details: ${response.data.msg}`);
    }
    
    return response.data.data;
  }

  /**
   * Get WAV conversion details
   */
  async getWavDetails(taskId: string): Promise<any> {
    const response = await this.client.get<SunoApiResponse<any>>(`/wav-format/record-info?taskId=${taskId}`);
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get WAV details: ${response.data.msg}`);
    }
    
    return response.data.data;
  }

  /**
   * Get vocal separation details
   */
  async getVocalSeparationDetails(taskId: string): Promise<any> {
    const response = await this.client.get<SunoApiResponse<any>>(`/vocal-removal/record-info?taskId=${taskId}`);
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get vocal separation details: ${response.data.msg}`);
    }
    
    return response.data.data;
  }

  /**
   * Get music video details
   */
  async getMusicVideoDetails(taskId: string): Promise<any> {
    const response = await this.client.get<SunoApiResponse<any>>(`/music-video/record-info?taskId=${taskId}`);
    
    if (response.data.code !== 200) {
      throw new Error(`Failed to get music video details: ${response.data.msg}`);
    }
    
    return response.data.data;
  }
}