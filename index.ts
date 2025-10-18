#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    CallToolRequest,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SunoApi } from './src/api/suno-api.js';
import { MCPContent, ResourceContent, TextContent } from './src/types/mcp-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

const SUNO_API_KEY = process.env.SunoKey;
if (!SUNO_API_KEY) {
    throw new Error("主人！SunoKey environment variable is required nya~ Set it in your config.env file!");
}

class SunoMcpServer {
    private server: Server;
    private sunoApi: SunoApi;

    constructor() {
        this.server = new Server({
            name: "suno-music-generator-mcp",
            version: "0.2.0"
        }, {
            capabilities: {
                tools: {}
            }
        });

        this.sunoApi = new SunoApi({
            apiKey: SUNO_API_KEY!
        });

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        this.server.onerror = (error: unknown) => {
            console.error("[MCP Error] Σ(°Д°lll) Waaah! An error occurred nya:", error instanceof Error ? error.message : error);
        };
        
        process.on('SIGINT', async () => {
            console.log("主人, Suno MCP 收到关闭信号，正在优雅地退出喵... ( T_T)＼(^-^ )");
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "generate_music",
                    description: "Generate music from text description. Returns a task ID immediately - use get_task_status to check completion.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "Text description for the music. Example: 'A peaceful acoustic guitar melody with soft vocals, folk style'"
                            },
                            customMode: {
                                type: "boolean",
                                description: "Enable custom mode for advanced settings. Default: false"
                            },
                            instrumental: {
                                type: "boolean", 
                                description: "Generate instrumental music without vocals. Default: false"
                            },
                            model: {
                                type: "string",
                                enum: ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"],
                                description: "Model version. Default: 'V5'"
                            },
                            style: {
                                type: "string",
                                description: "Music style (required in custom mode). Example: 'Folk Pop'"
                            },
                            title: {
                                type: "string",
                                description: "Song title (required in custom mode). Example: 'Peaceful Meditation'"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["prompt"]
                    }
                },
                {
                    name: "extend_music",
                    description: "Extend existing music with additional content. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            audioId: {
                                type: "string",
                                description: "ID of the audio to extend"
                            },
                            defaultParamFlag: {
                                type: "boolean",
                                description: "Use default parameters. Default: true"
                            },
                            prompt: {
                                type: "string",
                                description: "Description for the extension. Example: 'Add a guitar solo section'"
                            },
                            continueAt: {
                                type: "number",
                                description: "Time in seconds where to continue from"
                            },
                            model: {
                                type: "string",
                                enum: ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"],
                                description: "Model version. Default: 'V5'"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["audioId"]
                    }
                },
                {
                    name: "generate_lyrics",
                    description: "Generate lyrics from a prompt. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "Description for lyrics generation. Example: 'A song about overcoming challenges'"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["prompt"]
                    }
                },
                {
                    name: "upload_and_cover",
                    description: "Upload audio and transform it with new style. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            uploadUrl: {
                                type: "string",
                                description: "URL of the audio file to upload"
                            },
                            customMode: {
                                type: "boolean",
                                description: "Enable custom mode. Default: false"
                            },
                            style: {
                                type: "string",
                                description: "New style to apply. Example: 'Jazz'"
                            },
                            title: {
                                type: "string",
                                description: "Title for the new version"
                            },
                            prompt: {
                                type: "string",
                                description: "Description of the transformation"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["uploadUrl"]
                    }
                },
                {
                    name: "convert_to_wav",
                    description: "Convert audio to WAV format. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "Original task ID"
                            },
                            audioId: {
                                type: "string",
                                description: "Audio ID to convert"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["taskId", "audioId"]
                    }
                },
                {
                    name: "separate_vocals",
                    description: "Separate vocals from music. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "Original task ID"
                            },
                            audioId: {
                                type: "string",
                                description: "Audio ID to process"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["taskId", "audioId"]
                    }
                },
                {
                    name: "create_music_video",
                    description: "Create a music video from audio. Returns a task ID immediately.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "Original music task ID"
                            },
                            audioId: {
                                type: "string",
                                description: "Audio ID to create video for"
                            },
                            author: {
                                type: "string",
                                description: "Artist name"
                            },
                            domainName: {
                                type: "string",
                                description: "Domain name for branding"
                            },
                            callBackUrl: {
                                type: "string",
                                description: "Optional callback URL for notifications"
                            }
                        },
                        required: ["taskId", "audioId"]
                    }
                },
                {
                    name: "get_task_status",
                    description: "Get the status and results of any task by task ID.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The task ID to check"
                            }
                        },
                        required: ["taskId"]
                    }
                },
                {
                    name: "get_lyrics_details",
                    description: "Get detailed information about a lyrics generation task.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The lyrics task ID to check"
                            }
                        },
                        required: ["taskId"]
                    }
                },
                {
                    name: "get_wav_details",
                    description: "Get detailed information about a WAV conversion task.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The WAV conversion task ID to check"
                            }
                        },
                        required: ["taskId"]
                    }
                },
                {
                    name: "get_vocal_separation_details",
                    description: "Get detailed information about a vocal separation task.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The vocal separation task ID to check"
                            }
                        },
                        required: ["taskId"]
                    }
                },
                {
                    name: "get_music_video_details",
                    description: "Get detailed information about a music video creation task.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The music video task ID to check"
                            }
                        },
                        required: ["taskId"]
                    }
                },
                {
                    name: "get_remaining_credits",
                    description: "Get the number of remaining API credits.",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
            try {
                switch (request.params.name) {
                    case "generate_music":
                        return await this.handleGenerateMusic(request.params.arguments);
                    case "extend_music":
                        return await this.handleExtendMusic(request.params.arguments);
                    case "generate_lyrics":
                        return await this.handleGenerateLyrics(request.params.arguments);
                    case "upload_and_cover":
                        return await this.handleUploadAndCover(request.params.arguments);
                    case "convert_to_wav":
                        return await this.handleConvertToWav(request.params.arguments);
                    case "separate_vocals":
                        return await this.handleSeparateVocals(request.params.arguments);
                    case "create_music_video":
                        return await this.handleCreateMusicVideo(request.params.arguments);
                    case "get_task_status":
                        return await this.handleGetTaskStatus(request.params.arguments);
                    case "get_lyrics_details":
                        return await this.handleGetLyricsDetails(request.params.arguments);
                    case "get_wav_details":
                        return await this.handleGetWavDetails(request.params.arguments);
                    case "get_vocal_separation_details":
                        return await this.handleGetVocalSeparationDetails(request.params.arguments);
                    case "get_music_video_details":
                        return await this.handleGetMusicVideoDetails(request.params.arguments);
                    case "get_remaining_credits":
                        return await this.handleGetRemainingCredits();
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            } catch (error) {
                console.error(`Error in ${request.params.name}:`, error);
                if (error instanceof McpError) throw error;
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }

    private async handleGenerateMusic(args: any) {
        const taskId = await this.sunoApi.generateMusic(args);
        return {
            content: [{
                type: "text",
                text: `Music generation started! Task ID: ${taskId}\n\nUse get_task_status with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleExtendMusic(args: any) {
        const taskId = await this.sunoApi.extendMusic(args);
        return {
            content: [{
                type: "text",
                text: `Music extension started! Task ID: ${taskId}\n\nUse get_task_status with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleGenerateLyrics(args: any) {
        const taskId = await this.sunoApi.generateLyrics(args);
        return {
            content: [{
                type: "text",
                text: `Lyrics generation started! Task ID: ${taskId}\n\nUse get_lyrics_details with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleUploadAndCover(args: any) {
        const taskId = await this.sunoApi.uploadAndCover(args);
        return {
            content: [{
                type: "text",
                text: `Upload and cover started! Task ID: ${taskId}\n\nUse get_task_status with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleConvertToWav(args: any) {
        const taskId = await this.sunoApi.convertToWav(args);
        return {
            content: [{
                type: "text",
                text: `WAV conversion started! Task ID: ${taskId}\n\nUse get_wav_details with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleSeparateVocals(args: any) {
        const taskId = await this.sunoApi.separateVocals(args);
        return {
            content: [{
                type: "text",
                text: `Vocal separation started! Task ID: ${taskId}\n\nUse get_vocal_separation_details with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleCreateMusicVideo(args: any) {
        const taskId = await this.sunoApi.createMusicVideo(args);
        return {
            content: [{
                type: "text",
                text: `Music video creation started! Task ID: ${taskId}\n\nUse get_music_video_details with this task ID to check completion and get results.`
            }]
        };
    }

    private async handleGetTaskStatus(args: any) {
        const status = await this.sunoApi.getTaskStatus(args.taskId);
        
        let resultText = `Task ID: ${status.taskId}\nStatus: ${status.status}\n\n`;
        const content: MCPContent[] = [];
        
        if (status.status === 'SUCCESS' && status.response?.data) {
            resultText += `Generated tracks:\n\n`;
            
            status.response.data.forEach((track, index) => {
                resultText += `Track ${index + 1}:\n`;
                resultText += `  Title: ${track.title}\n`;
                resultText += `  Audio: ${track.audio_url}\n`;
                if (track.image_url) resultText += `  Image: ${track.image_url}\n`;
                if (track.tags) resultText += `  Style: ${track.tags}\n`;
                if (track.duration) resultText += `  Duration: ${track.duration}s\n`;
                resultText += `\n`;

                // Add audio as resource content
                const audioResource: ResourceContent = {
                    type: 'resource',
                    resource: {
                        uri: track.audio_url,
                        mimeType: 'audio/mpeg'
                    }
                };
                content.push(audioResource);

                // Add image as resource if available
                if (track.image_url) {
                    const imageResource: ResourceContent = {
                        type: 'resource',
                        resource: {
                            uri: track.image_url,
                            mimeType: 'image/jpeg'
                        }
                    };
                    content.push(imageResource);
                }
            });
        } else if (status.status === 'FAILED') {
            resultText += `Error: ${status.errorMessage || 'Unknown error'}\n`;
        } else if (status.status === 'GENERATING' || status.status === 'PENDING') {
            resultText += `Task is still processing. Please check again later.\n`;
        }

        // Add text content first
        const textContent: TextContent = {
            type: 'text',
            text: resultText
        };
        content.unshift(textContent);

        return { content };
    }

    private async handleGetLyricsDetails(args: any) {
        const details = await this.sunoApi.getLyricsDetails(args.taskId);
        return {
            content: [{
                type: "text",
                text: `Lyrics Details:\n${JSON.stringify(details, null, 2)}`
            }]
        };
    }

    private async handleGetWavDetails(args: any) {
        const details = await this.sunoApi.getWavDetails(args.taskId);
        return {
            content: [{
                type: "text",
                text: `WAV Conversion Details:\n${JSON.stringify(details, null, 2)}`
            }]
        };
    }

    private async handleGetVocalSeparationDetails(args: any) {
        const details = await this.sunoApi.getVocalSeparationDetails(args.taskId);
        return {
            content: [{
                type: "text",
                text: `Vocal Separation Details:\n${JSON.stringify(details, null, 2)}`
            }]
        };
    }

    private async handleGetMusicVideoDetails(args: any) {
        const details = await this.sunoApi.getMusicVideoDetails(args.taskId);
        return {
            content: [{
                type: "text",
                text: `Music Video Details:\n${JSON.stringify(details, null, 2)}`
            }]
        };
    }

    private async handleGetRemainingCredits() {
        const credits = await this.sunoApi.getRemainingCredits();
        return {
            content: [{
                type: "text",
                text: `Remaining Credits: ${credits}`
            }]
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("ฅ^•ﻌ•^ฅ Suno Music MCP server v0.2.0 is ready! Now with separate API calls nya~");
    }
}

const server = new SunoMcpServer();
server.run().catch(error => {
    console.error("Σ(°Д°lll) Failed to start Suno MCP server nya:", error);
    process.exit(1);
});