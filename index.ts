#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    CallToolRequest,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
    TextContent
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosError } from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    SunoMusicRequestArgs,
    isValidSunoMusicRequestArgs,
    SunoApiSubmitResponse,
    GetMusicDetailsArgs,
    isValidGetMusicDetailsArgs,
    MusicRecordInfoResponse
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

// --- Suno API Configuration ---
const SUNO_API_KEY = process.env.SunoKey;
if (!SUNO_API_KEY) {
    throw new Error("主人！SunoKey environment variable is required nya~ Set it in your config.env file!");
}

const SUNO_API_CONFIG = {
    BASE_URL: 'https://api.sunoapi.org',
    ENDPOINTS: {
        GENERATE: '/api/v1/generate',
        RECORD_INFO: '/api/v1/generate/record-info'
    },
    POLLING_INTERVAL_MS: 5000, // 5 seconds
    MAX_POLLING_ATTEMPTS: 60, // 5 minutes max polling (5s * 60 = 300s)
};
// --- End Suno API Configuration ---

class SunoMcpServer {
    private server: Server;
    private sunoApiAxiosInstance: AxiosInstance;

    constructor() {
        this.server = new Server({
            name: "suno-music-generator-mcp",
            version: "0.1.0"
        }, {
            capabilities: {
                tools: {}
            }
        });

        this.sunoApiAxiosInstance = axios.create({
            baseURL: SUNO_API_CONFIG.BASE_URL,
            headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        this.server.onerror = (error: unknown) => { // Typed error
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
                    name: "generate_music_suno",
                    description: "Generates a song using the Suno API. Returns the audio URL upon completion. Polling for results may take a few minutes.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "Description or lyrics for the song. Example: 'A calm and relaxing piano track'"
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
                                description: "Music style (required in custom mode). Example: 'Classical, Piano'"
                            },
                            title: {
                                type: "string",
                                description: "Song title (required in custom mode). Example: 'Peaceful Meditation'"
                            },
                            negativeTags: {
                                type: "string",
                                description: "Styles to exclude. Example: 'Heavy Metal, Drums'"
                            },
                            vocalGender: {
                                type: "string",
                                enum: ["m", "f"],
                                description: "Preferred vocal gender"
                            },
                            styleWeight: {
                                type: "number",
                                description: "Style weight (0.00-1.00)"
                            },
                            weirdnessConstraint: {
                                type: "number",
                                description: "Creative deviation (0.00-1.00)"
                            },
                            audioWeight: {
                                type: "number",
                                description: "Audio influence weight (0.00-1.00)"
                            }
                        },
                        required: ["prompt"]
                    }
                },
                {
                    name: "get_music_details_suno",
                    description: "Retrieve detailed information about a music generation task by task ID, including status, parameters, and results.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: {
                                type: "string",
                                description: "The task ID returned from a previous music generation. Example: '5c79****be8e'"
                            }
                        },
                        required: ["taskId"]
                    }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
            if (request.params.name === "generate_music_suno") {
                return this.handleGenerateMusicTool(request.params.arguments);
            }
            if (request.params.name === "get_music_details_suno") {
                return this.handleGetMusicDetailsTool(request.params.arguments);
            }
            throw new McpError(ErrorCode.MethodNotFound, `Hmph! Master, I don't know the tool named '${request.params.name}' nya!`);
        });
    }

    private async handleGenerateMusicTool(args: any) { // Changed unknown to any for now, validation is done by isValidSunoMusicRequestArgs
        if (!isValidSunoMusicRequestArgs(args)) {
            console.error("Invalid args received for generate_music_suno:", args);
            throw new McpError(ErrorCode.InvalidParams, "Invalid input parameters!");
        }

        const payload: any = {
            prompt: args.prompt,
            customMode: args.customMode || false,
            instrumental: args.instrumental || false,
            model: args.model || "V5",
            callBackUrl: "https://example.com/callback" // Placeholder
        };

        if (args.customMode) {
            if (args.style) payload.style = args.style;
            if (args.title) payload.title = args.title;
        }

        if (args.negativeTags) payload.negativeTags = args.negativeTags;
        if (args.vocalGender) payload.vocalGender = args.vocalGender;
        if (args.styleWeight !== undefined) payload.styleWeight = args.styleWeight;
        if (args.weirdnessConstraint !== undefined) payload.weirdnessConstraint = args.weirdnessConstraint;
        if (args.audioWeight !== undefined) payload.audioWeight = args.audioWeight;

        console.log("Sending payload to Suno API:", JSON.stringify(payload));

        try {
            // 1. Submit music generation task
            const submitResponse = await this.sunoApiAxiosInstance.post<SunoApiSubmitResponse>(
                SUNO_API_CONFIG.ENDPOINTS.GENERATE,
                payload
            );

            console.log("Received submit response from Suno API:", submitResponse.data);

            if (submitResponse.data.code !== 200 || !submitResponse.data.data?.taskId) {
                throw new McpError(ErrorCode.InternalError, `Suno API submission failed: ${submitResponse.data.msg || 'No task ID returned.'}`);
            }

            const taskId = submitResponse.data.data.taskId;
            console.log(`Music generation task submitted. Task ID: ${taskId}. Polling for results...`);

            // 2. Poll for task status
            let attempts = 0;
            while (attempts < SUNO_API_CONFIG.MAX_POLLING_ATTEMPTS) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, SUNO_API_CONFIG.POLLING_INTERVAL_MS));

                console.log(`Polling attempt ${attempts} for task ${taskId}...`);
                const fetchResponse = await this.sunoApiAxiosInstance.get<MusicRecordInfoResponse>(
                    SUNO_API_CONFIG.ENDPOINTS.RECORD_INFO,
                    {
                        params: { taskId }
                    }
                );

                console.log(`Received fetch response for task ${taskId}:`, fetchResponse.data);

                if (fetchResponse.data.code !== 200) {
                    console.warn(`Polling for task ${taskId}: API returned code ${fetchResponse.data.code}. Message: ${fetchResponse.data.msg}`);
                    continue;
                }

                const taskDetails = fetchResponse.data.data;

                if (taskDetails.status === "SUCCESS" && taskDetails.response?.sunoData && taskDetails.response.sunoData.length > 0) {
                    const songs = taskDetails.response.sunoData;
                    let resultText = `Songs generated successfully!\n\n`;
                    
                    songs.forEach((song, index) => {
                        resultText += `Song ${index + 1}:\n`;
                        resultText += `Title: ${song.title}\n`;
                        resultText += `Audio: ${song.audioUrl}\n`;
                        if (song.imageUrl) resultText += `Image: ${song.imageUrl}\n`;
                        if (song.tags) resultText += `Style: ${song.tags}\n`;
                        if (song.duration) resultText += `Duration: ${song.duration}s\n`;
                        resultText += `\n`;
                    });

                    return { content: [{ type: "text", text: resultText }] };
                } else if (taskDetails.status === "CREATE_TASK_FAILED" || taskDetails.status === "GENERATE_AUDIO_FAILED") {
                    throw new McpError(ErrorCode.InternalError, `Task ${taskId} failed: ${taskDetails.errorMessage || 'Unknown reason'}`);
                }

                console.log(`Task ${taskId} status: ${taskDetails.status}`);
            }

            throw new McpError(ErrorCode.InternalError, `Task ${taskId} timed out after ${attempts} polling attempts.`);

        } catch (error: unknown) {
            console.error("Error calling Suno API:", error instanceof Error ? error.message : error);
            if (axios.isAxiosError(error)) { // AxiosError type guard handles error.response
                const apiError = error.response?.data as any; // Assuming data can be anything
                const status = error.response?.status;
                const message = apiError?.msg || apiError?.message || (error as AxiosError).message;
                return {
                    content: [{
                        type: "text",
                        text: `Suno API error (Status ${status}): ${message}`
                    }],
                    isError: true,
                };
            }
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async handleGetMusicDetailsTool(args: any) {
        if (!isValidGetMusicDetailsArgs(args)) {
            console.error("Invalid args received for get_music_details_suno:", args);
            throw new McpError(ErrorCode.InvalidParams, "Invalid input parameters! taskId is required.");
        }

        console.log(`Fetching music details for task ID: ${args.taskId}`);

        try {
            const response = await this.sunoApiAxiosInstance.get<MusicRecordInfoResponse>(
                SUNO_API_CONFIG.ENDPOINTS.RECORD_INFO,
                {
                    params: { taskId: args.taskId }
                }
            );

            console.log("Received music details response:", response.data);

            if (response.data.code !== 200) {
                throw new McpError(ErrorCode.InternalError, `Failed to get music details: ${response.data.msg}`);
            }

            const data = response.data.data;
            let resultText = `Task ID: ${data.taskId}\n`;
            resultText += `Status: ${data.status}\n`;
            resultText += `Type: ${data.type}\n\n`;

            if (data.errorMessage) {
                resultText += `Error: ${data.errorMessage}\n`;
            }

            if (data.response?.sunoData && data.response.sunoData.length > 0) {
                resultText += `Generated Songs:\n\n`;
                data.response.sunoData.forEach((song, index) => {
                    resultText += `Song ${index + 1}:\n`;
                    resultText += `Title: ${song.title}\n`;
                    resultText += `Audio: ${song.audioUrl}\n`;
                    if (song.streamAudioUrl) resultText += `Stream: ${song.streamAudioUrl}\n`;
                    if (song.imageUrl) resultText += `Image: ${song.imageUrl}\n`;
                    if (song.tags) resultText += `Style: ${song.tags}\n`;
                    if (song.duration) resultText += `Duration: ${song.duration}s\n`;
                    if (song.modelName) resultText += `Model: ${song.modelName}\n`;
                    resultText += `\n`;
                });
            }

            return { content: [{ type: "text", text: resultText }] };

        } catch (error: unknown) {
            console.error("Error fetching music details:", error instanceof Error ? error.message : error);
            if (axios.isAxiosError(error)) {
                const apiError = error.response?.data as any;
                const status = error.response?.status;
                const message = apiError?.msg || apiError?.message || (error as AxiosError).message;
                return {
                    content: [{
                        type: "text",
                        text: `Suno API error (Status ${status}): ${message}`
                    }],
                    isError: true,
                };
            }
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("ฅ^•ﻌ•^ฅ Suno Music MCP server is ready and listening on stdio for Master's commands! Nya~");
    }
}

const server = new SunoMcpServer();
server.run().catch(error => {
    console.error("Σ(°Д°lll) Failed to start Suno MCP server nya:", error);
    process.exit(1);
});