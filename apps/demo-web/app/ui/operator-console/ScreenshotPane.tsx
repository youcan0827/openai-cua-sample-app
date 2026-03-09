"use client";

import type {
  BrowserScreenshotArtifact,
  BrowserState,
  RunDetail,
} from "@cua-sample/replay-schema";

import { formatClock, humanizeToken } from "./helpers";

type ScreenshotPaneProps = {
  emptyReviewMessage: string;
  emptyTimelineMessage: string;
  onJumpToLatestScreenshot: () => void;
  onOpenReplay: () => void;
  onScrubberChange: (value: string) => void;
  onSelectScreenshot: (screenshotId: string) => void;
  replayDisabled: boolean;
  runnerBaseUrl: string;
  screenshots: BrowserScreenshotArtifact[];
  selectedBrowser: BrowserState | null;
  selectedRun: RunDetail | null;
  selectedScenarioTitle: string;
  selectedScreenshot: BrowserScreenshotArtifact | null;
  selectedScreenshotIndex: number;
  stageUrl: string;
  viewingLiveFrame: boolean;
};

export function ScreenshotPane({
  emptyReviewMessage,
  emptyTimelineMessage,
  onJumpToLatestScreenshot,
  onOpenReplay,
  onScrubberChange,
  onSelectScreenshot,
  replayDisabled,
  runnerBaseUrl,
  screenshots,
  selectedBrowser,
  selectedRun,
  selectedScenarioTitle,
  selectedScreenshot,
  selectedScreenshotIndex,
  stageUrl,
  viewingLiveFrame,
}: ScreenshotPaneProps) {
  const screenshotCount = screenshots.length;

  return (
    <div className="browserSurface">
      <div className="stageChrome">
        <div className="stageUrl">{selectedScreenshot?.pageUrl ?? stageUrl}</div>
      </div>

      <div className="browserCanvas">
        <div className={`reviewSummary ${selectedScreenshot ? "" : "isEmpty"}`}>
          <div className="reviewCopy">
            <p className="reviewEyebrow">
              {selectedScreenshot
                ? selectedRun?.run.status === "running" && viewingLiveFrame
                  ? "ライブフレーム"
                  : "固定フレーム"
                : selectedRun
                  ? "フレーム待機中"
                  : "選択中のアプリ"}
            </p>
            <h3>
              {selectedScreenshot
                ? selectedScreenshot.pageTitle?.trim() ||
                  humanizeToken(selectedScreenshot.label)
                : selectedRun
                  ? "ブラウザキャプチャ待機中"
                  : "レビュー準備完了"}
            </h3>
            {!selectedScreenshot ? <p>{emptyReviewMessage}</p> : null}
          </div>
          <div className="reviewMeta">
            {selectedScreenshot ? (
              <>
                <span className="readoutChip">
                  フレーム {selectedScreenshotIndex + 1} / {screenshotCount}
                </span>
                <span className="readoutChip">
                  {formatClock(selectedScreenshot.capturedAt)}
                </span>
                {selectedBrowser?.viewport ? (
                  <span className="readoutChip">
                    {selectedBrowser.viewport.width} ×{" "}
                    {selectedBrowser.viewport.height}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="readoutChip">フレームなし</span>
            )}
          </div>
        </div>

        <div className={`stageMedia ${selectedScreenshot ? "hasCapture" : ""}`}>
          {selectedScreenshot ? (
            // Replay frames come from the runner's artifact endpoint, so Next image optimization is not a fit here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${selectedScenarioTitle} のキャプチャフレーム ${selectedScreenshotIndex + 1}`}
              className="stageScreenshot"
              src={`${runnerBaseUrl}${selectedScreenshot.url}`}
            />
          ) : (
            <div className="stagePlaceholder">
              <h3>{selectedRun ? "最初のフレーム待機中" : "キャプチャ準備完了"}</h3>
              <p>{emptyReviewMessage}</p>
            </div>
          )}
        </div>

        <div className={`scrubberPanel ${screenshots.length === 0 ? "isEmpty" : ""}`}>
          <div className="scrubberRow">
            <div className="scrubberCopy">
              <h4>タイムラインを確認</h4>
              <p>
                {screenshots.length === 0
                  ? emptyTimelineMessage
                  : viewingLiveFrame && selectedRun?.run.status === "running"
                    ? "実行中は最新のキャプチャを追跡しています。"
                    : "キャプチャされたブラウザフレームをスクラブして、モデルが見た正確な状態を確認します。"}
              </p>
            </div>
            <div className="scrubberActions">
              {!viewingLiveFrame && screenshots.length > 0 ? (
                <button
                  className="utilityButton"
                  onClick={onJumpToLatestScreenshot}
                  type="button"
                >
                  最新へジャンプ
                </button>
              ) : null}
              <button
                className="utilityButton"
                disabled={replayDisabled}
                onClick={onOpenReplay}
                type="button"
              >
                リプレイ JSON
              </button>
            </div>
          </div>

          <div className="scrubberRangeRow">
            <span className="scrubberCount">{screenshots.length > 0 ? 1 : 0}</span>
            <input
              aria-label="キャプチャフレームスクラバー"
              className="scrubberRange"
              disabled={screenshots.length <= 1}
              max={Math.max(0, screenshots.length - 1)}
              min={0}
              onChange={(event) => onScrubberChange(event.target.value)}
              step={1}
              type="range"
              value={
                screenshots.length > 0 ? Math.max(0, selectedScreenshotIndex) : 0
              }
            />
            <span className="scrubberCount">{screenshots.length}</span>
          </div>

          <div className={`filmstrip ${screenshots.length === 0 ? "isEmpty" : ""}`}>
            {screenshots.length > 0 ? (
              screenshots.map((screenshot, index) => (
                <button
                  className={`filmstripFrame ${
                    screenshot.id === selectedScreenshot?.id ? "isActive" : ""
                  }`}
                  key={screenshot.id}
                  onClick={() => onSelectScreenshot(screenshot.id)}
                  type="button"
                >
                  {/* Filmstrip thumbnails also come from dynamic replay artifacts served by the runner. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`フレーム ${index + 1}`}
                    className="filmstripThumb"
                    src={`${runnerBaseUrl}${screenshot.url}`}
                  />
                  <span className="filmstripMeta">
                    <span className="filmstripTitle">フレーム {index + 1}</span>
                    <span className="filmstripTime">
                      {formatClock(screenshot.capturedAt)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="filmstripPlaceholder">
                <span className="filmstripPlaceholderTitle">
                  キャプチャ待機中
                </span>
                <span className="filmstripPlaceholderText">
                  {emptyTimelineMessage}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
