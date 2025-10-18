// Types for MCP content responses
export interface TextContent {
  type: 'text';
  text: string;
  annotations?: any;
}

export interface ImageContent {
  type: 'image';
  data: string; // base64
  mimeType: string;
  annotations?: any;
}

export interface AudioContent {
  type: 'audio';
  data: string; // base64
  mimeType: string;
  annotations?: any;
}

// Support for MCP "resource" content
export interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    blob?: string; // base64
    [key: string]: any; // allow attaching structured metadata (json-serializable)
  };
  annotations?: any;
}

export type MCPContent = TextContent | ImageContent | AudioContent | ResourceContent;