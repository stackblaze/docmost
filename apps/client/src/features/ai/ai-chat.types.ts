export type AiChatMessage = {
  id: string;
  role: string;
  content: string;
};

export type ChatAttachment = {
  id: string;
  fileName: string;
  fileExt: string;
  fileSize: number;
  mimeType: string;
};

export type PageMention = {
  id: string;
  title: string;
  slugId: string;
  spaceSlug?: string;
  icon?: string;
};
