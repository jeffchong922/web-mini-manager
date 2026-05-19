@AGENTS.md

## 微信第三方平台

- [第三方平台介绍](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/getting_started/terminology_introduce.html)
- [第三方平台 API](https://developers.weixin.qq.com/doc/oplatform/openApi/)（数据转换以项目定义为准）

## 微信第三方接口对接

所有第三方接口都需要通过 `Nextjs` 进行代理转发，避免跨域报错

### 接口响应格式

接口在正常情况返回的数据格式：

```typescript
export type ResponseData<T = null> = {
  code: string;
  data: T;
  message: string;
  succeed: boolean;
};
```

**数据处理正常情况下** `code` 将会返回 `'000000'`，提示该请求已正确返回数据
