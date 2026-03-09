"use client";

import type {
  BrowserMode,
  ExecutionMode,
  ResponseTurnBudget,
  ScenarioManifest,
} from "@cua-sample/replay-schema";

import {
  browserHelpText,
  engineHelpText,
  turnBudgetHelpText,
  verificationHelpText,
} from "./helpers";
import type { ActionButtonsProps } from "./types";

type RunControlsProps = ActionButtonsProps & {
  browserMode: BrowserMode;
  controlsLocked: boolean;
  maxResponseTurns: ResponseTurnBudget;
  mode: ExecutionMode;
  onBrowserModeChange: (value: BrowserMode) => void;
  onMaxResponseTurnsChange: (value: ResponseTurnBudget) => void;
  onModeChange: (value: ExecutionMode) => void;
  onPromptChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onVerificationEnabledChange: (value: boolean) => void;
  prompt: string;
  scenarios: ScenarioManifest[];
  selectedScenarioId: string;
  showActionButtons?: boolean;
  verificationEnabled: boolean;
};

type InfoPopoverProps = {
  id: string;
  label: string;
  text: string;
};

function InfoPopover({ id, label, text }: InfoPopoverProps) {
  return (
    <span className="fieldInfo">
      <button
        aria-describedby={id}
        aria-label={`${label} help`}
        className="fieldInfoButton"
        type="button"
      >
        i
      </button>
      <span className="fieldPopover" id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

function SegmentControl<T extends string>({
  ariaLabel,
  disabled,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div aria-label={ariaLabel} className="segmentControl" role="tablist">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`segmentButton ${value === option.value ? "isActive" : ""}`}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function RunActionButtons({
  onResetWorkspace,
  onStartRun,
  onStopRun,
  pendingAction,
  resetDisabled,
  startDisabled,
  stopDisabled,
}: ActionButtonsProps) {
  return (
    <div className="stageToolbarActions">
      <button
        className="primaryButton"
        disabled={startDisabled}
        onClick={() => void onStartRun()}
        type="button"
      >
        {pendingAction === "start" ? "起動中..." : "実行開始"}
      </button>
      <button
        className="secondaryButton"
        disabled={stopDisabled}
        onClick={() => void onStopRun()}
        type="button"
      >
        {pendingAction === "stop" ? "停止中..." : "停止"}
      </button>
      <button
        className="secondaryButton"
        disabled={resetDisabled}
        onClick={() => void onResetWorkspace()}
        type="button"
      >
        {pendingAction === "reset" ? "リセット中..." : "ワークスペースリセット"}
      </button>
    </div>
  );
}

export function RunControls({
  browserMode,
  controlsLocked,
  maxResponseTurns,
  mode,
  onBrowserModeChange,
  onMaxResponseTurnsChange,
  onModeChange,
  onPromptChange,
  onScenarioChange,
  onVerificationEnabledChange,
  prompt,
  scenarios,
  selectedScenarioId,
  showActionButtons = true,
  verificationEnabled,
  ...actionButtons
}: RunControlsProps) {
  return (
    <aside className="panel controlsPanel">
      <div className="controlsHeader">
        <h2>コントロール</h2>
      </div>

      <div className="controlsGrid">
        <div className="railField scenarioField">
          <label htmlFor="scenario-select">シナリオ</label>
          <select
            disabled={controlsLocked}
            id="scenario-select"
            onChange={(event) => onScenarioChange(event.target.value)}
            value={selectedScenarioId}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title}
              </option>
            ))}
          </select>
        </div>

        <div className="railField promptField">
          <label htmlFor="run-prompt">実行プロンプト</label>
          <textarea
            disabled={controlsLocked}
            id="run-prompt"
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="GPT-5.4 のオペレータータスクを記述してください。"
            rows={5}
            value={prompt}
          />
        </div>
      </div>

      <details className="advancedPanel">
        <summary>
          <span className="advancedSummaryCopy">
            <span className="advancedLabel">詳細設定</span>
            <span className="advancedHint">
              エンジン、ブラウザ、検証、ターン予算
            </span>
          </span>
        </summary>

        <div className="advancedContent">
          <div className="railField">
            <div className="fieldLabel">
              <span>エンジン</span>
              <InfoPopover
                id="engine-help-popover"
                label="エンジン"
                text={engineHelpText}
              />
            </div>
            <SegmentControl
              ariaLabel="実行モード"
              disabled={controlsLocked}
              onChange={onModeChange}
              options={[
                { label: "コード", value: "code" },
                { label: "ネイティブ", value: "native" },
              ]}
              value={mode}
            />
          </div>

          <div className="railField">
            <div className="fieldLabel">
              <span>ブラウザ</span>
              <InfoPopover
                id="browser-help-popover"
                label="ブラウザ"
                text={browserHelpText}
              />
            </div>
            <SegmentControl
              ariaLabel="ブラウザモード"
              disabled={controlsLocked}
              onChange={onBrowserModeChange}
              options={[
                { label: "ヘッドレス", value: "headless" },
                { label: "表示あり", value: "headful" },
              ]}
              value={browserMode}
            />
          </div>

          <div className="railField budgetField">
            <div className="fieldLabel">
              <label htmlFor="turn-budget">ターン予算</label>
              <InfoPopover
                id="turn-budget-help-popover"
                label="ターン予算"
                text={turnBudgetHelpText}
              />
            </div>
            <div className="budgetControl">
              <input
                disabled={controlsLocked}
                id="turn-budget"
                max={50}
                min={4}
                onChange={(event) =>
                  onMaxResponseTurnsChange(
                    Number(event.target.value) as ResponseTurnBudget,
                  )
                }
                step={1}
                type="range"
                value={maxResponseTurns}
              />
              <span className="budgetValue">{maxResponseTurns} ターン</span>
            </div>
          </div>

          <div className="railField">
            <div className="fieldLabel">
              <span>検証</span>
              <InfoPopover
                id="verification-help-popover"
                label="検証"
                text={verificationHelpText}
              />
            </div>
            <label className="feedToggle">
              <input
                checked={verificationEnabled}
                disabled={controlsLocked}
                onChange={(event) => onVerificationEnabledChange(event.target.checked)}
                type="checkbox"
              />
              検証チェックを実行
            </label>
          </div>
        </div>
      </details>

      {showActionButtons ? <RunActionButtons {...actionButtons} /> : null}
    </aside>
  );
}
