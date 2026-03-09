"use client";

import { formatClock, formatRunnerIssueMessage, scenarioTargetDisplay } from "./helpers";
import { ActivityFeed } from "./ActivityFeed";
import { RunControls, RunActionButtons } from "./RunControls";
import { ConsoleTopbar, RunSummary } from "./RunSummary";
import { ScreenshotPane } from "./ScreenshotPane";
import type { OperatorConsoleProps } from "./types";
import { useRunStream } from "./useRunStream";

export function OperatorConsole({
  initialRunnerIssue,
  runnerBaseUrl,
  scenarios,
}: OperatorConsoleProps) {
  const {
    activityFeedLabel,
    activityFeedRef,
    activityItems,
    browserMode,
    controlsLocked,
    currentIssue,
    followActivityFeed,
    handleActivityFeedScroll,
    handleJumpToLatestActivity,
    handleJumpToLatestScreenshot,
    handleOpenReplay,
    handleResetWorkspace,
    handleScenarioChange,
    handleScrubberChange,
    handleSelectScreenshot,
    handleStartRun,
    handleStopRun,
    matchingWorkspaceState,
    maxResponseTurns,
    mode,
    pendingAction,
    prompt,
    runnerOnline,
    screenshots,
    selectedBrowser,
    selectedRun,
    selectedScenario,
    selectedScreenshot,
    selectedScreenshotIndex,
    selectedScenarioId,
    setBrowserMode,
    setMaxResponseTurns,
    setMode,
    setPrompt,
    setStreamLogs,
    setVerificationEnabled,
    streamLogs,
    verificationEnabled,
    viewingLiveFrame,
  } = useRunStream({
    initialRunnerIssue,
    runnerBaseUrl,
    scenarios,
  });

  const selectedScenarioTitle = selectedScenario?.title ?? "選択中のアプリ";
  const stageUrl =
    selectedBrowser?.currentUrl ??
    (selectedRun
      ? scenarioTargetDisplay(selectedScenario)
      : "アプリ起動待ち");
  const startDisabled =
    !runnerOnline ||
    !selectedScenario ||
    pendingAction !== null ||
    controlsLocked ||
    prompt.trim().length === 0;
  const stopDisabled =
    !selectedRun ||
    selectedRun.run.status !== "running" ||
    pendingAction !== null;
  const resetDisabled =
    !runnerOnline || !selectedScenario || pendingAction === "start";
  const replayDisabled = !selectedRun;
  const issueMessage = currentIssue ? formatRunnerIssueMessage(currentIssue) : null;
  const stageHeadline = selectedRun
    ? selectedRun.run.status === "running"
      ? "実行中"
      : selectedRun.run.status === "completed"
        ? "実行完了"
        : selectedRun.run.status === "cancelled"
          ? "実行キャンセル"
          : currentIssue?.title ?? "実行失敗"
    : matchingWorkspaceState
      ? "ワークスペースリセット完了"
      : currentIssue
        ? currentIssue.title
        : runnerOnline
          ? "待機中"
          : "ランナーオフライン";
  const stageSupportCopy = selectedRun
    ? selectedRun.run.status === "failed"
      ? issueMessage
      : null
    : matchingWorkspaceState
      ? `変更可能なワークスペースを ${matchingWorkspaceState.workspacePath} に ${formatClock(
          matchingWorkspaceState.resetAt,
        )} でコピーしました。`
      : currentIssue
        ? issueMessage
        : runnerOnline
        ? "実行を開始すると選択したラボが開き、アクティビティがこのコンソールにストリームされます。"
        : issueMessage;
  const topbarSubtitle = selectedRun
    ? `${selectedScenarioTitle} をレビュー中`
    : "ブラウザタスクを実行、検査、レビュー。";
  const emptyReviewMessage = selectedRun
    ? selectedRun.run.status === "running"
      ? "実行中です。最初のキャプチャフレームがまもなくここに表示されます。"
      : selectedRun.run.status === "failed"
        ? issueMessage ?? "スクリーンショットが撮影される前に実行が失敗しました。"
        : "この実行はブラウザフレームのキャプチャなしに終了しました。"
    : currentIssue
      ? issueMessage ?? currentIssue.error
      : runnerOnline
        ? "実行を開始してキャプチャフレームのレビューを始めてください。"
        : issueMessage ?? "ランナーは利用できません。";
  const emptyTimelineMessage = selectedRun
    ? selectedRun.run.status === "failed"
      ? issueMessage ?? "キャプチャが保存される前に実行が終了しました。"
      : "実行が進むにつれてキャプチャフレームがここに表示されます。"
    : currentIssue
      ? issueMessage ?? currentIssue.error
      : runnerOnline
        ? "実行が開始するとキャプチャフレームがここに表示されます。"
        : issueMessage ?? "ランナーは利用できません。";

  return (
    <main className="consoleShell">
      <section className="consoleFrame">
        <ConsoleTopbar
          runnerOnline={runnerOnline}
          topbarSubtitle={topbarSubtitle}
        />

        <section className="benchTop">
          <section className="controlColumn">
            <RunControls
              browserMode={browserMode}
              controlsLocked={controlsLocked}
              maxResponseTurns={maxResponseTurns}
              mode={mode}
              onBrowserModeChange={setBrowserMode}
              onMaxResponseTurnsChange={setMaxResponseTurns}
              onModeChange={setMode}
              onPromptChange={setPrompt}
              onResetWorkspace={handleResetWorkspace}
              onScenarioChange={handleScenarioChange}
              onStartRun={handleStartRun}
              onStopRun={handleStopRun}
              onVerificationEnabledChange={setVerificationEnabled}
              pendingAction={pendingAction}
              prompt={prompt}
              resetDisabled={resetDisabled}
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              showActionButtons={false}
              startDisabled={startDisabled}
              stopDisabled={stopDisabled}
              verificationEnabled={verificationEnabled}
            />

            <ActivityFeed
              activityFeedLabel={activityFeedLabel}
              activityFeedRef={activityFeedRef}
              activityItems={activityItems}
              followActivityFeed={followActivityFeed}
              onActivityFeedScroll={handleActivityFeedScroll}
              onJumpToLatestActivity={handleJumpToLatestActivity}
              onSelectScreenshot={handleSelectScreenshot}
              onStreamLogsChange={setStreamLogs}
              screenshots={screenshots}
              streamLogs={streamLogs}
            />
          </section>

          <section className="stageColumn">
            <div className="stageControlBar">
              <RunSummary
                stageHeadline={stageHeadline}
                stageSupportCopy={stageSupportCopy}
              />
              <RunActionButtons
                onResetWorkspace={handleResetWorkspace}
                onStartRun={handleStartRun}
                onStopRun={handleStopRun}
                pendingAction={pendingAction}
                resetDisabled={resetDisabled}
                startDisabled={startDisabled}
                stopDisabled={stopDisabled}
              />
            </div>

            <ScreenshotPane
              emptyReviewMessage={emptyReviewMessage}
              emptyTimelineMessage={emptyTimelineMessage}
              onJumpToLatestScreenshot={handleJumpToLatestScreenshot}
              onOpenReplay={handleOpenReplay}
              onScrubberChange={handleScrubberChange}
              onSelectScreenshot={handleSelectScreenshot}
              replayDisabled={replayDisabled}
              runnerBaseUrl={runnerBaseUrl}
              screenshots={screenshots}
              selectedBrowser={selectedBrowser}
              selectedRun={selectedRun}
              selectedScenarioTitle={selectedScenarioTitle}
              selectedScreenshot={selectedScreenshot}
              selectedScreenshotIndex={selectedScreenshotIndex}
              stageUrl={stageUrl}
              viewingLiveFrame={viewingLiveFrame}
            />
          </section>
        </section>
      </section>
    </main>
  );
}
