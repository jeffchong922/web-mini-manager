// extJson 内的 ext 扩展配置
type ExtConfig = {
  env: string;
  appid: string;
  consoleLog?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// extJson 扩展 JSON 配置
type ExtJson = {
  extEnable: boolean;
  extAppid: string;
  directCommit: boolean;
  ext: ExtConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// /codeCommit 接口请求参数
export type CodeCommitParams = {
  appid: string;
  templateId: number;
  userDesc: string;
  userVersion: string;
  extJson: ExtJson;
};

// 微信 API 通用响应格式
export type ResponseData<T = null> = {
  code: string;
  data: T;
  message: string;
  succeed: boolean;
};

export type MiniProgramItem = {
  authorizer_appid: string;
  refresh_token: string;
  appName: string;
  auth_time: string;
  status: string;
};

export type TemplateItem = {
  draftId: number;
  templateId: number;
  userVersion: string;
  userDesc: string;
  templateType: number;
  createTime: number;
  sourceMiniProgramAppid: string;
  sourceMiniProgram: string;
};

// 提交配置项 = ext 内容 + extJson 额外字段 + 元数据
export type SubmitConfigItem = {
  appid: string;
  isStop?: boolean;
  ext: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type DraftItem = {
  draftId: number;
  templateId: number | null;
  userVersion: string;
  userDesc: string;
  templateType: number | null;
  createTime: number;
  sourceMiniProgramAppid: string;
  sourceMiniProgram: string;
};
