# 角色语音

默认用浏览器语音合成（自动挑选系统里质量最好的日语 / 中文语音）。

如果你有**自己录制或已获授权**的音频，放到这个目录，并在 `manifest.json` 里登记：

```json
{
  "okabe": "/voices/okabe.mp3",
  "mayuri": "/voices/mayuri.mp3"
}
```

成员 id：okabe / kurisu / mayuri / daru / ruka / faris / suzuha / moeka。

注意：动画原声属于版权方与声优本人，购买的音频通常只授权个人使用；部署到公开网站等于再分发，请自行确认授权。
