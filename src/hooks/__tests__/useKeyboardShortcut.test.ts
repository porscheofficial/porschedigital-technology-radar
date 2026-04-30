import { renderHook } from "@testing-library/react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

describe("useKeyboardShortcut", () => {
  it("fires onTrigger when the matching key is pressed (no modifier)", () => {
    const onTrigger = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "Escape", onTrigger }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("requires meta key when meta=true and fires on Cmd+K", () => {
    const onTrigger = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "k", meta: true, onTrigger }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(onTrigger).not.toHaveBeenCalled();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("also fires on Ctrl+K when both meta and ctrl are true", () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: "k", meta: true, ctrl: true, onTrigger }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it("does not fire when disabled", () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        meta: true,
        onTrigger,
        enabled: false,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ignores non-matching keys", () => {
    const onTrigger = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "k", meta: true, onTrigger }));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", metaKey: true }),
    );
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const onTrigger = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: "Escape", onTrigger }),
    );
    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
