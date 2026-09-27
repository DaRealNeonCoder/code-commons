"use client";

import { useEffect, useRef, useState } from "react";

// Shared dropdown building blocks used by both the search filter bar and the
// content-creation forms, so multi-select / single-select filters look and
// behave identically everywhere they appear. Extracted from the original
// SearchFilterBar.jsx with no behavior changes.

export function filterGroups(groups, query) {
  if (!query) return groups;
  const q = query.toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter((opt) =>
        opt.label.toLowerCase().includes(q)
      ),
    }))
    .filter((group) => group.options.length > 0);
}

// Shared open/search/outside-click/escape behavior for both dropdown flavors below.
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;

    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) close();
    }
    function handleKey(e) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return { open, setOpen, query, setQuery, ref, close };
}

export function DropdownTrigger({ label, displayText, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-2 py-1.5 text-left text-sm dark:border-zinc-700 dark:bg-zinc-950"
    >
      <span className="truncate text-zinc-700 dark:text-zinc-300">
        {displayText}
      </span>
      <span className="ml-1 text-xs text-zinc-400">▾</span>
    </button>
  );
}

export function DropdownSearchInput({ query, setQuery, placeholder }) {
  return (
    <div className="border-b border-zinc-100 p-2 dark:border-zinc-900">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

export function MultiSelectDropdown({
  label,
  groups,
  selected,
  onToggle,
  searchable = true,
  searchPlaceholder = "Search...",
}) {
  const { open, setOpen, query, setQuery, ref } = useDropdown();

  const flatOptions = groups.flatMap((g) => g.options);
  const selectedLabels = selected
    .map((id) => flatOptions.find((opt) => opt.id === id)?.label)
    .filter(Boolean);

  const displayText =
    selectedLabels.length === 0
      ? "Any"
      : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} selected`;

  const visibleGroups = filterGroups(groups, query);
  const hasResults = visibleGroups.some((g) => g.options.length > 0);

  return (
    <div ref={ref} className="relative min-w-[10rem]">
      <p className="mb-1 font-mono text-xs text-zinc-500">{label}</p>

      <DropdownTrigger
        label={label}
        displayText={displayText}
        onClick={() => setOpen((o) => !o)}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {searchable && (
            <DropdownSearchInput
              query={query}
              setQuery={setQuery}
              placeholder={searchPlaceholder}
            />
          )}

          <div className="max-h-60 overflow-y-auto p-2">
            {!hasResults && (
              <p className="px-1 py-1 text-xs text-zinc-400">No matches</p>
            )}

            {visibleGroups.map((group, i) => (
              <div key={group.groupLabel || i} className="mb-2 last:mb-0">
                {group.groupLabel && (
                  <p className="mb-1 px-1 text-xs font-medium text-zinc-400">
                    {group.groupLabel}
                  </p>
                )}

                {group.options.map((opt) => (
                  <CheckboxRow
                    key={opt.id}
                    label={opt.label}
                    checked={selected.includes(opt.id)}
                    onChange={() => onToggle(opt.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyLabel = "Any",
}) {
  const { open, setOpen, query, setQuery, ref, close } = useDropdown();

  const filtered = query
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const selectedOption = options.find((opt) => opt.id === value);
  const displayText = selectedOption ? selectedOption.label : emptyLabel;

  return (
    <div ref={ref} className="relative min-w-[10rem]">
      <p className="mb-1 font-mono text-xs text-zinc-500">{label}</p>

      <DropdownTrigger
        label={label}
        displayText={displayText}
        onClick={() => setOpen((o) => !o)}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-56 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {searchable && (
            <DropdownSearchInput
              query={query}
              setQuery={setQuery}
              placeholder={searchPlaceholder}
            />
          )}

          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                !value ? "text-teal-600 dark:text-teal-400" : ""
              }`}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 && (
              <p className="px-2 py-1 text-xs text-zinc-400">No matches</p>
            )}

            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  close();
                }}
                className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                  value === opt.id ? "text-teal-600 dark:text-teal-400" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckboxRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-teal-600"
      />
      {label}
    </label>
  );
}