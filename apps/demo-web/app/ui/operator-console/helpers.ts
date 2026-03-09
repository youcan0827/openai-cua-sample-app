import {
  runnerErrorResponseSchema,
  type BrowserScreenshotArtifact,
  type ResponseTurnBudget,
  type RunDetail,
  type RunEvent,
  type RunEventLevel,
  type ScenarioManifest,
} from "@cua-sample/replay-schema";

import type {
  ActivityItem,
  LogEntry,
  RunnerIssue,
  TranscriptEntry,
} from "./types";

export const defaultRunModel =
  process.env.NEXT_PUBLIC_CUA_DEFAULT_MODEL ?? "gpt-5.4";
export const defaultMaxResponseTurns = Number(
  process.env.NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS ?? "24",
) as ResponseTurnBudget;
export const engineHelpText =
  "ネイティブはブラウザランタイムをクリック、ドラッグ、タイピング、スクリーンショットに直接操作します。コードはスクリプト化されたブラウザ制御のために永続的な Playwright REPL を使用します。";
export const browserHelpText =
  "ヘッドレスはブラウザをオフスクリーンで実行します。表示ありはブラウザウィンドウを開き、セッションをライブで監視できます。";
export const turnBudgetHelpText =
  "実行を停止するまでにランナーが使用できるモデルターン数を制限します。予算が高いほど長い計画が可能ですが、時間がかかります。";
export const verificationHelpText =
  "モデルが停止した後にシナリオの組み込みチェックを実行します。モデルの完了したアクションループを成功条件として扱う場合はオフにしてください。";
export const runnerUnavailableHint =
  "`pnpm dev` または `OPENAI_API_KEY=... pnpm dev:runner` を起動してからページを更新してください。";

function titleForIssueCode(code: string) {
  switch (code) {
    case "runner_unavailable":
      return "ランナー利用不可";
    case "missing_api_key":
      return "ランナー API キー未設定";
    case "live_mode_unavailable":
      return "ライブモード利用不可";
    case "unsupported_safety_acknowledgement":
      return "安全確認利用不可";
    case "run_already_active":
      return "実行中です";
    case "invalid_request":
      return "不正なリクエスト";
    default:
      return humanizeToken(code);
  }
}

export function formatClock(value: string) {
  const date = new Date(value);

  return date.toLocaleTimeString("ja-JP", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function humanizeToken(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatRunnerIssueMessage(issue: RunnerIssue) {
  return issue.hint ? `${issue.error} ${issue.hint}` : issue.error;
}

export function createRunnerIssue(
  code: string,
  error: string,
  hint?: string,
): RunnerIssue {
  return {
    code,
    error,
    ...(hint ? { hint } : {}),
    title: titleForIssueCode(code),
  };
}

export function parseRunnerIssue(value: unknown) {
  const parsed = runnerErrorResponseSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return createRunnerIssue(parsed.data.code, parsed.data.error, parsed.data.hint);
}

export function createRunnerUnavailableIssue(detail?: string) {
  return createRunnerIssue(
    "runner_unavailable",
    detail
      ? `オペレーターコンソールがランナーに接続できませんでした。${detail}`
      : "オペレーターコンソールがランナーに接続できませんでした。",
    runnerUnavailableHint,
  );
}

export function deriveRunFailureIssue(runDetail: RunDetail | null) {
  if (!runDetail || runDetail.run.status !== "failed") {
    return null;
  }

  const notes = runDetail.run.summary?.notes ?? [];
  const message = notes[0] ?? "実行中に失敗しました。";
  const code = notes.find((note) => note.startsWith("Error code: "))?.slice(12);
  const hint = notes.find((note) => note.startsWith("Hint: "))?.slice(6);

  return createRunnerIssue(code ?? "run_failed", message, hint);
}

export function scenarioTargetDisplay(scenario: ScenarioManifest | null) {
  if (!scenario) {
    return "ランナー利用不可";
  }

  return scenario.startTarget.kind === "remote_url"
    ? scenario.startTarget.url
    : scenario.startTarget.path;
}

export function createManualLog(
  event: string,
  detail: string,
  level: RunEventLevel,
): LogEntry {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    detail,
    event,
    key: `manual-${event}-${now}`,
    level,
    time: formatClock(now),
  };
}

export function createManualTranscript(
  lane: TranscriptEntry["lane"],
  speaker: string,
  body: string,
): TranscriptEntry {
  const now = new Date().toISOString();

  return {
    body,
    createdAt: now,
    key: `manual-${speaker}-${now}`,
    lane,
    speaker,
    time: formatClock(now),
  };
}

function formatUrlLabel(value: string) {
  try {
    const url = new URL(value);
    const path = url.pathname === "/" ? "" : url.pathname;

    return `${url.hostname}${path}${url.search}`;
  } catch {
    return value;
  }
}

function parseToolPayload(detail: string | undefined) {
  if (!detail) {
    return null;
  }

  const match = detail.match(/^([a-z_]+)\s+(\{[\s\S]+\})$/i);

  if (!match) {
    return null;
  }

  try {
    const label = match[1];
    const payloadText = match[2];

    if (!label || !payloadText) {
      return null;
    }

    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    const code =
      typeof payload.code === "string" && label === "exec_js"
        ? payload.code
        : undefined;
    const detailPayload = { ...payload };

    if (code) {
      delete detailPayload.code;
    }

    return {
      ...(code ? { code } : {}),
      ...(Object.keys(detailPayload).length > 0
        ? { detail: JSON.stringify(detailPayload, null, 2) }
        : {}),
      label,
      payload: detailPayload,
    };
  } catch {
    return null;
  }
}

function describeToolCall(label: string, payload: Record<string, unknown>) {
  switch (label) {
    case "exec_js":
      return "ブラウザスクリプト実行";
    default:
      return Object.keys(payload).length > 0
        ? humanizeToken(label)
        : "ツールリクエスト";
  }
}

function summarizeToolCall(label: string, payload: Record<string, unknown>) {
  switch (label) {
    case "exec_js":
      return "モデルがブラウザランタイムを直接使用しています。";
    default:
      return Object.keys(payload).length > 0
        ? JSON.stringify(payload)
        : "モデルがワークスペースヘルパーツールをリクエストしました。";
  }
}

function formatCoordinate(xValue: unknown, yValue: unknown) {
  const x = Number(xValue);
  const y = Number(yValue);

  return Number.isFinite(x) && Number.isFinite(y)
    ? ` @ ${Math.round(x)},${Math.round(y)}`
    : "";
}

function summarizeComputerAction(action: Record<string, unknown>) {
  const type = typeof action.type === "string" ? action.type : "action";

  switch (type) {
    case "click":
      return `クリック${formatCoordinate(action.x, action.y)}`;
    case "double_click":
      return `ダブルクリック${formatCoordinate(action.x, action.y)}`;
    case "drag":
      return "ドラッグ";
    case "move":
      return `ポインター移動${formatCoordinate(action.x, action.y)}`;
    case "scroll": {
      const deltaY = Number(action.delta_y ?? action.deltaY ?? action.scroll_y);

      if (!Number.isFinite(deltaY) || deltaY === 0) {
        return "スクロール";
      }

      return `スクロール ${Math.abs(Math.round(deltaY))} px ${
        deltaY > 0 ? "下" : "上"
      }`;
    }
    case "type": {
      const text = typeof action.text === "string" ? action.text : "";
      const preview =
        text.length > 28 ? `${text.slice(0, 25).trimEnd()}...` : text;

      return preview ? `入力 "${preview}"` : "テキスト入力";
    }
    case "keypress": {
      const keys = Array.isArray(action.keys)
        ? action.keys.map((key) => String(key))
        : typeof action.key === "string"
          ? [action.key]
          : [];

      return keys.length > 0 ? `キー押下 ${keys.join(" + ")}` : "キー押下";
    }
    case "wait": {
      const durationMs = Number(action.ms ?? action.duration_ms ?? 1_000);

      if (!Number.isFinite(durationMs)) {
        return "待機";
      }

      return durationMs >= 1_000
        ? `待機 ${(durationMs / 1_000).toFixed(1)} 秒`
        : `待機 ${Math.round(durationMs)} ms`;
    }
    case "screenshot":
      return "スクリーンショット撮影";
    default:
      return humanizeToken(type);
  }
}

function parseActionBatchDetail(detail: string | undefined) {
  if (!detail) {
    return null;
  }

  const separator = detail.indexOf(" :: ");
  const payloadText = separator >= 0 ? detail.slice(separator + 4) : detail;

  try {
    const payload = JSON.parse(payloadText) as unknown;

    if (!Array.isArray(payload)) {
      return null;
    }

    const actions = payload.filter(
      (value): value is Record<string, unknown> =>
        Boolean(value) && typeof value === "object",
    );

    return {
      detail: JSON.stringify(actions, null, 2),
      preview:
        actions.map((action) => summarizeComputerAction(action)).join(" • ") ||
        "ブラウザアクションなし",
    };
  } catch {
    return null;
  }
}

function findRelatedScreenshot(
  detail: string | undefined,
  screenshots: BrowserScreenshotArtifact[],
) {
  if (!detail) {
    return null;
  }

  return screenshots.find((screenshot) => screenshot.url === detail) ?? null;
}

function formatScreenshotSummary(screenshot: BrowserScreenshotArtifact) {
  const page = screenshot.pageTitle?.trim() || formatUrlLabel(screenshot.pageUrl);

  return `${page} · ${formatClock(screenshot.capturedAt)}`;
}

function withOptionalDetail(detail: string | undefined) {
  return detail ? { detail } : {};
}

export function mapRunEventToActivity(
  event: RunEvent,
  screenshots: BrowserScreenshotArtifact[],
): ActivityItem {
  const parsedPayload = parseToolPayload(event.detail);
  const parsedActionBatch = parseActionBatchDetail(event.detail);
  const relatedScreenshot = findRelatedScreenshot(event.detail, screenshots);

  switch (event.type) {
    case "run_started":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "実行開始",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "workspace_prepared":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "ワークスペース準備完了",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "lab_started":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "ラボランタイム開始",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "browser_session_started":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "observe",
        headline: "ブラウザセッション開始",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "browser_navigated":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "observe",
        headline: "ナビゲーション",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ? formatUrlLabel(event.detail) : event.message,
        time: formatClock(event.createdAt),
      };
    case "function_call_requested":
      return {
        createdAt: event.createdAt,
        ...(parsedPayload?.code ? { code: parsedPayload.code } : {}),
        ...(parsedPayload?.detail
          ? { detail: parsedPayload.detail }
          : event.detail
            ? { detail: event.detail }
            : {}),
        family: "tool",
        headline: parsedPayload
          ? describeToolCall(parsedPayload.label, parsedPayload.payload)
          : "ツールリクエスト",
        key: `activity-${event.id}`,
        level: event.level,
        summary: parsedPayload
          ? summarizeToolCall(parsedPayload.label, parsedPayload.payload)
          : event.message,
        time: formatClock(event.createdAt),
      };
    case "function_call_completed":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "tool",
        headline: event.detail
          ? `${humanizeToken(event.detail)} 完了`
          : "ツール完了",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.message,
        time: formatClock(event.createdAt),
      };
    case "computer_call_requested":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(parsedActionBatch?.detail ?? event.detail),
        family: "action",
        headline: "ブラウザアクションバッチ待機",
        key: `activity-${event.id}`,
        level: event.level,
        summary: parsedActionBatch?.preview ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "computer_actions_executed":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(parsedActionBatch?.detail ?? event.detail),
        family: "action",
        headline: "ブラウザアクションバッチ実行",
        key: `activity-${event.id}`,
        level: event.level,
        summary: parsedActionBatch?.preview ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "computer_call_output_recorded":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(
          relatedScreenshot
            ? JSON.stringify(
                {
                  capturedAt: relatedScreenshot.capturedAt,
                  label: relatedScreenshot.label,
                  pageTitle: relatedScreenshot.pageTitle,
                  pageUrl: relatedScreenshot.pageUrl,
                },
                null,
                2,
              )
            : event.detail,
        ),
        family: "snapshot",
        headline: "ブラウザフレームキャプチャ",
        key: `activity-${event.id}`,
        level: event.level,
        ...(relatedScreenshot ? { screenshotId: relatedScreenshot.id } : {}),
        summary: relatedScreenshot
          ? formatScreenshotSummary(relatedScreenshot)
          : event.message,
        time: formatClock(event.createdAt),
      };
    case "screenshot_captured":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(
          relatedScreenshot
            ? JSON.stringify(
                {
                  capturedAt: relatedScreenshot.capturedAt,
                  label: relatedScreenshot.label,
                  pageTitle: relatedScreenshot.pageTitle,
                  pageUrl: relatedScreenshot.pageUrl,
                },
                null,
                2,
              )
            : event.detail,
        ),
        family: "snapshot",
        headline: relatedScreenshot
          ? `${humanizeToken(relatedScreenshot.label)} を撮影`
          : "スクリーンショット撮影",
        key: `activity-${event.id}`,
        level: event.level,
        ...(relatedScreenshot ? { screenshotId: relatedScreenshot.id } : {}),
        summary: relatedScreenshot
          ? formatScreenshotSummary(relatedScreenshot)
          : event.message,
        time: formatClock(event.createdAt),
      };
    case "verification_completed":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "verify",
        headline: "検証完了",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "run_completed":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "実行完了",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.message,
        time: formatClock(event.createdAt),
      };
    case "run_failed":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "実行失敗",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "run_cancelled":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: "実行キャンセル",
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    case "run_progress":
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family:
          event.message === "Model returned a final response."
            ? "verify"
            : "system",
        headline: event.message.replace(/\.$/, ""),
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
    default:
      return {
        createdAt: event.createdAt,
        ...withOptionalDetail(event.detail),
        family: "system",
        headline: humanizeToken(event.type),
        key: `activity-${event.id}`,
        level: event.level,
        summary: event.detail ?? event.message,
        time: formatClock(event.createdAt),
      };
  }
}

export function mapManualLogToActivity(entry: LogEntry): ActivityItem {
  return {
    createdAt: entry.createdAt,
    detail: entry.detail,
    family: "system",
    headline: humanizeToken(entry.event),
    key: `activity-${entry.key}`,
    level: entry.level,
    summary: entry.detail,
    time: entry.time,
  };
}

export function mapManualTranscriptToActivity(entry: TranscriptEntry): ActivityItem {
  return {
    createdAt: entry.createdAt,
    detail: entry.speaker,
    family: entry.lane === "verification" ? "verify" : "operator",
    headline: humanizeToken(entry.speaker),
    key: `activity-${entry.key}`,
    level: entry.lane === "verification" ? "ok" : "pending",
    summary: entry.body,
    time: entry.time,
  };
}

export function activityFamilyLabel(family: ActivityItem["family"]) {
  switch (family) {
    case "action":
      return "操作";
    case "observe":
      return "観察";
    case "operator":
      return "オペレーター";
    case "snapshot":
      return "スナップショット";
    case "tool":
      return "ツール";
    case "verify":
      return "検証";
    default:
      return "システム";
  }
}
