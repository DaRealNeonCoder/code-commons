"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeReactCodeLoopResult, REACT_CODE_LOOP_STATUS } from "@/lib/reactCodeLoop";

/**
 * Owns the edit -> compile -> runnable-artifact loop used by authoring tools.
 * The compiler is injected so this hook remains usable with an API, a local
 * compiler, or a test double without pulling esbuild into the browser bundle.
 */
export function useReactCodeLoop({
  source,
  initialSource = "",
  onSourceChange,
  compile,
  debounceMs = 350,
  autoCompile = true,
  onStatusChange,
}) {
  const [localSource, setLocalSource] = useState(initialSource);
  const [compiled, setCompiled] = useState("");
  const [status, setStatus] = useState(REACT_CODE_LOOP_STATUS.idle);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const controllerRef = useRef(null);
  const currentSource = source ?? localSource;

  const updateStatus = useCallback((nextStatus, nextError = "") => {
    setStatus(nextStatus);
    setError(nextError);
    onStatusChange?.(nextStatus, nextError);
  }, [onStatusChange]);

  const setSource = useCallback((next) => {
    const value = typeof next === "function" ? next(currentSource) : String(next ?? "");
    controllerRef.current?.abort();
    requestRef.current += 1;
    if (source == null) setLocalSource(value);
    onSourceChange?.(value);
    setCompiled("");
    updateStatus(REACT_CODE_LOOP_STATUS.idle);
  }, [currentSource, onSourceChange, source, updateStatus]);

  const compileNow = useCallback(async (value = currentSource) => {
    const text = String(value ?? "");
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;

    if (!text.trim()) {
      setCompiled("");
      updateStatus(REACT_CODE_LOOP_STATUS.idle);
      return "";
    }

    updateStatus(REACT_CODE_LOOP_STATUS.compiling);
    try {
      const result = await compile(text, { signal: controller.signal });
      if (controller.signal.aborted || requestId !== requestRef.current) return "";
      const nextCompiled = normalizeReactCodeLoopResult(result);
      setCompiled(nextCompiled);
      updateStatus(REACT_CODE_LOOP_STATUS.ready);
      return nextCompiled;
    } catch (valueError) {
      if (controller.signal.aborted || requestId !== requestRef.current) return "";
      const message = valueError?.message || "React demo compilation failed.";
      setCompiled("");
      updateStatus(REACT_CODE_LOOP_STATUS.error, message);
      return "";
    }
  }, [compile, currentSource, updateStatus]);

  useEffect(() => {
    if (!autoCompile) return undefined;
    const timer = setTimeout(() => { void compileNow(); }, debounceMs);
    return () => clearTimeout(timer);
  }, [autoCompile, compileNow, debounceMs, currentSource]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setSource(initialSource);
  }, [initialSource, setSource]);

  return {
    source: currentSource,
    compiled,
    status,
    error,
    setSource,
    compile: compileNow,
    reset,
    isCompiling: status === REACT_CODE_LOOP_STATUS.compiling,
    isReady: status === REACT_CODE_LOOP_STATUS.ready,
  };
}
