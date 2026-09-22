import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Cloud, Search, X } from "lucide-react";
import type { ModelsInfo } from "@/api-client";
import { groupModelsByProvider, providerLabel } from "../model-options.js";

type ModelOption = ModelsInfo["models"][number];

export function ModelCombobox({
  models,
  value,
  onChange,
  emptyOption,
  unavailableOption,
  disabled = false,
  className = "",
  formatModelLabel = (model) => model.displayName,
}: {
  models: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  emptyOption?: { label: string; value?: string };
  unavailableOption?: { value: string; label: string };
  disabled?: boolean;
  className?: string;
  formatModelLabel?: (model: ModelOption) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLowerCase();
  const filteredModels = useMemo(
    () =>
      models.filter((model) =>
        !normalized ||
        `${model.displayName} ${model.id} ${model.provider}`.toLowerCase().includes(normalized),
      ),
    [models, normalized],
  );
  const groups = groupModelsByProvider(filteredModels);
  const selected = models.find((model) => model.id === value);
  const triggerLabel = selected ? formatModelLabel(selected) : unavailableOption?.label ?? emptyOption?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const index = models.findIndex((model) => model.id === value);
    setCursor(index < 0 ? 0 : index);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, value, models]);

  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(filteredModels.length - 1, 0)));
  }, [filteredModels.length]);

  const pick = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (!disabled) setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown" && filteredModels.length > 0) {
      event.preventDefault();
      setCursor((current) => (current + 1) % filteredModels.length);
    } else if (event.key === "ArrowUp" && filteredModels.length > 0) {
      event.preventDefault();
      setCursor((current) => (current - 1 + filteredModels.length) % filteredModels.length);
    } else if (event.key === "Enter" && filteredModels[cursor]) {
      event.preventDefault();
      pick(filteredModels[cursor].id);
    }
  };

  return (
    <div className={`model-picker ${className}`} ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="model-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || (models.length === 0 && !emptyOption && !unavailableOption)}
        onClick={() => setOpen((current) => !current)}
      >
        <Cloud size={15} aria-hidden="true" />
        <span className="model-picker-label"><span className="model-picker-model">{triggerLabel}</span></span>
        <ChevronDown size={14} className="model-picker-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="model-picker-menu">
          <div className="model-picker-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              placeholder="Search models..."
              aria-label="Search models"
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
            />
            {query && (
              <button type="button" aria-label="Clear model search" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </div>
          <ul className="model-picker-results" role="listbox" aria-label="Models">
            {emptyOption && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === (emptyOption.value ?? "")}
                  className={`model-picker-item${value === (emptyOption.value ?? "") ? " active" : ""}`}
                  onClick={() => pick(emptyOption.value ?? "")}
                >
                  {emptyOption.label}
                </button>
              </li>
            )}
            {unavailableOption && (
              <li>
                <button type="button" role="option" className="model-picker-item unavailable" disabled>
                  {unavailableOption.label}
                </button>
              </li>
            )}
            {groups.map((group) => (
              <li className="model-picker-group" role="presentation" key={group.provider}>
                <div className="model-picker-group-label">{providerLabel(group.provider)}</div>
                <ul className="model-picker-group-items" role="group" aria-label={providerLabel(group.provider)}>
                  {group.models.map(({ model, index }) => (
                    <li key={model.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={model.id === value}
                        className={`model-picker-item${model.id === value ? " active" : ""}${index === cursor ? " cursor" : ""}`}
                        onClick={() => pick(model.id)}
                      >
                        <Cloud size={14} aria-hidden="true" />
                        {formatModelLabel(model)}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {filteredModels.length === 0 && !emptyOption && !unavailableOption && (
              <li className="provider-model-empty">No models found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
