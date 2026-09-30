export interface IApiKey {
  id: string;
  name: string;
  token?: string;
  creatorId: string;
  workspaceId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}
