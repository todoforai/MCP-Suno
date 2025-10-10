// types.ts

/**
 * Interface for Suno music generation arguments
 */
export interface SunoMusicRequestArgs {
    /**
     * Lyrics/description content.
     * @example "A short test song"
     */
    prompt: string;

    /**
     * Music style tags, comma-separated. Required in custom mode.
     * @example "acoustic, folk, pop"
     */
    style?: string;

    /**
     * Song title. Required in custom mode.
     * @example "Starry Night Serenade"
     */
    title?: string;

    /**
     * Model version.
     * @enum ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]
     * @default "V5"
     */
    model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";

    /**
     * Whether to generate instrumental music.
     * @default false
     */
    instrumental?: boolean;

    /**
     * Enable custom mode for advanced settings.
     * @default false
     */
    customMode?: boolean;

    /**
     * Music styles to exclude.
     * @example "Heavy Metal, Upbeat Drums"
     */
    negativeTags?: string;

    /**
     * Preferred vocal gender.
     * @enum ["m", "f"]
     */
    vocalGender?: "m" | "f";

    /**
     * Style weight (0.00-1.00).
     */
    styleWeight?: number;

    /**
     * Weirdness constraint (0.00-1.00).
     */
    weirdnessConstraint?: number;

    /**
     * Audio weight (0.00-1.00).
     */
    audioWeight?: number;
}

/**
 * Interface for Suno API audio data
 */
export interface SunoAudioData {
    id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    lyric?: string;
    duration?: number;
    tags?: string;
    // added for record-info details
    streamAudioUrl?: string;
    prompt?: string;
    modelName?: string;
    createTime?: string;
}

/**
 * Interface for Suno API submit music response
 */
export interface SunoApiSubmitResponse {
    code: number;
    msg: string;
    data: {
        taskId: string;
    };
}

/**
 * Interface for get music details arguments
 */
export interface GetMusicDetailsArgs {
    /**
     * Task ID from a previous music generation
     * @example "5c79****be8e"
     */
    taskId: string;
}

/**
 * Validates arguments for get_music_details tool
 */
export function isValidGetMusicDetailsArgs(args: any): args is GetMusicDetailsArgs {
    return args && typeof args === 'object' && typeof args.taskId === 'string' && args.taskId.trim() !== '';
}

/**
 * Interface for music generation record info response
 */
export interface MusicRecordInfoResponse {
    code: number;
    msg: string;
    data: {
        taskId: string;
        parentMusicId: string;
        param: string;
        response: {
            taskId: string;
            sunoData: SunoAudioData[];
        } | null;
        status: "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION" | "SENSITIVE_WORD_ERROR";
        type: string;
        errorCode: string | null;
        errorMessage: string | null;
    };
}

/**
 * Validates arguments for the generate_music tool
 */
export function isValidSunoMusicRequestArgs(args: any): args is SunoMusicRequestArgs {
    if (!args || typeof args !== 'object') return false;

    // prompt is always required
    if (typeof args.prompt !== 'string' || args.prompt.trim() === '') return false;

    // In custom mode, style and title are required
    if (args.customMode === true) {
        if (!args.instrumental) {
            if (typeof args.style !== 'string' || args.style.trim() === '') return false;
        }
        if (typeof args.title !== 'string' || args.title.trim() === '') return false;
    }

    if (args.model !== undefined && !["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"].includes(args.model)) return false;
    if (args.instrumental !== undefined && typeof args.instrumental !== 'boolean') return false;
    if (args.customMode !== undefined && typeof args.customMode !== 'boolean') return false;

    // Validate weight parameters
    if (args.styleWeight !== undefined && (typeof args.styleWeight !== 'number' || args.styleWeight < 0 || args.styleWeight > 1)) return false;
    if (args.weirdnessConstraint !== undefined && (typeof args.weirdnessConstraint !== 'number' || args.weirdnessConstraint < 0 || args.weirdnessConstraint > 1)) return false;
    if (args.audioWeight !== undefined && (typeof args.audioWeight !== 'number' || args.audioWeight < 0 || args.audioWeight > 1)) return false;

    return true;
}