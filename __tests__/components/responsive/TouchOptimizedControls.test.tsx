import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TouchOptimizedControls } from "@/components/responsive/TouchOptimizedControls";

// Mock touch events
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>
) => {
  return new TouchEvent(type, {
    touches: touches.map((touch) => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
    changedTouches: touches.map((touch) => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
    targetTouches: touches.map((touch) => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
  });
};

describe("TouchOptimizedControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Touch target sizing", () => {
    it("ensures minimum touch target size of 44px", () => {
      render(
        <TouchOptimizedControls>
          <button>Test Button</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByRole("button");
      const styles = window.getComputedStyle(button);

      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
    });

    it("adds appropriate padding for touch targets", () => {
      render(
        <TouchOptimizedControls>
          <button>Small Button</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("touch-target");
    });

    it("maintains spacing between touch targets", () => {
      render(
        <TouchOptimizedControls>
          <button>Button 1</button>
          <button>Button 2</button>
        </TouchOptimizedControls>
      );

      const buttons = screen.getAllByRole("button");
      const container = buttons[0].parentElement;

      expect(container).toHaveClass("touch-spaced");
    });
  });

  describe("Gesture recognition", () => {
    it("recognizes tap gestures", () => {
      const onTap = vi.fn();

      render(
        <TouchOptimizedControls onTap={onTap}>
          <div data-testid="tap-target">Tap me</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("tap-target");

      fireEvent(
        target,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );
      fireEvent(
        target,
        createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }])
      );

      expect(onTap).toHaveBeenCalled();
    });

    it("recognizes swipe gestures", () => {
      const onSwipe = vi.fn();

      render(
        <TouchOptimizedControls onSwipe={onSwipe}>
          <div data-testid="swipe-target">Swipe me</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("swipe-target");

      fireEvent(
        target,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );
      fireEvent(
        target,
        createTouchEvent("touchmove", [{ clientX: 200, clientY: 100 }])
      );
      fireEvent(
        target,
        createTouchEvent("touchend", [{ clientX: 200, clientY: 100 }])
      );

      expect(onSwipe).toHaveBeenCalledWith({
        direction: "right",
        distance: 100,
      });
    });

    it("recognizes long press gestures", async () => {
      const onLongPress = vi.fn();

      render(
        <TouchOptimizedControls onLongPress={onLongPress}>
          <div data-testid="longpress-target">Long press me</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("longpress-target");

      fireEvent(
        target,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );

      // Wait for long press duration
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onLongPress).toHaveBeenCalled();
    });

    it("recognizes pinch gestures", () => {
      const onPinch = vi.fn();

      render(
        <TouchOptimizedControls onPinch={onPinch}>
          <div data-testid="pinch-target">Pinch me</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("pinch-target");

      // Start with two fingers
      fireEvent(
        target,
        createTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ])
      );

      // Move fingers closer together
      fireEvent(
        target,
        createTouchEvent("touchmove", [
          { clientX: 125, clientY: 100 },
          { clientX: 175, clientY: 100 },
        ])
      );

      fireEvent(target, createTouchEvent("touchend", []));

      expect(onPinch).toHaveBeenCalledWith({ scale: 0.5 });
    });
  });

  describe("Haptic feedback", () => {
    it("provides haptic feedback on touch interactions", () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: mockVibrate,
        writable: true,
      });

      render(
        <TouchOptimizedControls hapticFeedback={true}>
          <button data-testid="haptic-button">Haptic Button</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByTestId("haptic-button");
      fireEvent.click(button);

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it("provides different haptic patterns for different interactions", () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: mockVibrate,
        writable: true,
      });

      render(
        <TouchOptimizedControls hapticFeedback={true}>
          <div data-testid="longpress-haptic">Long press for haptic</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("longpress-haptic");
      fireEvent(
        target,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );

      setTimeout(() => {
        expect(mockVibrate).toHaveBeenCalledWith([50, 50, 50]);
      }, 500);
    });
  });

  describe("Touch feedback visual cues", () => {
    it("shows visual feedback on touch start", () => {
      render(
        <TouchOptimizedControls>
          <button data-testid="visual-feedback">Visual Feedback</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByTestId("visual-feedback");

      fireEvent(
        button,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );

      expect(button).toHaveClass("touch-active");
    });

    it("removes visual feedback on touch end", () => {
      render(
        <TouchOptimizedControls>
          <button data-testid="visual-feedback">Visual Feedback</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByTestId("visual-feedback");

      fireEvent(
        button,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );
      fireEvent(
        button,
        createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }])
      );

      expect(button).not.toHaveClass("touch-active");
    });

    it("shows ripple effect on touch", () => {
      render(
        <TouchOptimizedControls rippleEffect={true}>
          <button data-testid="ripple-button">Ripple Button</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByTestId("ripple-button");

      fireEvent(
        button,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );

      const ripple = button.querySelector(".ripple-effect");
      expect(ripple).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("maintains keyboard navigation support", () => {
      render(
        <TouchOptimizedControls>
          <button data-testid="keyboard-button">Keyboard Button</button>
        </TouchOptimizedControls>
      );

      const button = screen.getByTestId("keyboard-button");
      button.focus();

      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: "Enter" });
      expect(button).toHaveClass("keyboard-active");
    });

    it("provides appropriate ARIA labels for touch interactions", () => {
      render(
        <TouchOptimizedControls>
          <div data-testid="swipeable" role="button" tabIndex={0}>
            Swipeable Item
          </div>
        </TouchOptimizedControls>
      );

      const swipeable = screen.getByTestId("swipeable");
      expect(swipeable).toHaveAttribute(
        "aria-label",
        expect.stringContaining("swipe")
      );
    });

    it("announces touch gestures to screen readers", () => {
      render(
        <TouchOptimizedControls announceGestures={true}>
          <div data-testid="gesture-item">Gesture Item</div>
        </TouchOptimizedControls>
      );

      const item = screen.getByTestId("gesture-item");
      fireEvent(
        item,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );
      fireEvent(
        item,
        createTouchEvent("touchmove", [{ clientX: 200, clientY: 100 }])
      );
      fireEvent(
        item,
        createTouchEvent("touchend", [{ clientX: 200, clientY: 100 }])
      );

      const announcement = screen.getByRole("status", { hidden: true });
      expect(announcement).toHaveTextContent("Swiped right");
    });
  });

  describe("Performance optimization", () => {
    it("throttles touch move events", () => {
      const onTouchMove = vi.fn();

      render(
        <TouchOptimizedControls onTouchMove={onTouchMove}>
          <div data-testid="move-target">Move Target</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("move-target");

      // Trigger multiple move events quickly
      for (let i = 0; i < 10; i++) {
        fireEvent(
          target,
          createTouchEvent("touchmove", [{ clientX: 100 + i, clientY: 100 }])
        );
      }

      // Should be throttled to fewer calls
      expect(onTouchMove).toHaveBeenCalledTimes(1);
    });

    it("uses passive event listeners for better performance", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(
        <TouchOptimizedControls>
          <div data-testid="passive-target">Passive Target</div>
        </TouchOptimizedControls>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { passive: true }
      );
    });
  });

  describe("Multi-touch support", () => {
    it("handles multiple simultaneous touches", () => {
      const onMultiTouch = vi.fn();

      render(
        <TouchOptimizedControls onMultiTouch={onMultiTouch}>
          <div data-testid="multi-touch">Multi Touch</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("multi-touch");

      fireEvent(
        target,
        createTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
          { clientX: 150, clientY: 200 },
        ])
      );

      expect(onMultiTouch).toHaveBeenCalledWith({ touchCount: 3 });
    });

    it("tracks individual touch points", () => {
      const onTouchTrack = vi.fn();

      render(
        <TouchOptimizedControls onTouchTrack={onTouchTrack}>
          <div data-testid="touch-track">Touch Track</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("touch-track");

      fireEvent(
        target,
        createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
      );
      fireEvent(
        target,
        createTouchEvent("touchmove", [{ clientX: 150, clientY: 150 }])
      );

      expect(onTouchTrack).toHaveBeenCalledWith({
        touchId: 0,
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 150, y: 150 },
        deltaX: 50,
        deltaY: 50,
      });
    });
  });

  describe("Edge cases", () => {
    it("handles touch events outside component boundaries", () => {
      const onTouchOutside = vi.fn();

      render(
        <TouchOptimizedControls onTouchOutside={onTouchOutside}>
          <div data-testid="boundary-test">Boundary Test</div>
        </TouchOptimizedControls>
      );

      // Touch outside the component
      fireEvent(
        document.body,
        createTouchEvent("touchstart", [{ clientX: -100, clientY: -100 }])
      );

      expect(onTouchOutside).toHaveBeenCalled();
    });

    it("handles rapid touch sequences", () => {
      const onRapidTouch = vi.fn();

      render(
        <TouchOptimizedControls onRapidTouch={onRapidTouch}>
          <div data-testid="rapid-touch">Rapid Touch</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("rapid-touch");

      // Rapid touch sequence
      for (let i = 0; i < 5; i++) {
        fireEvent(
          target,
          createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }])
        );
        fireEvent(
          target,
          createTouchEvent("touchend", [{ clientX: 100, clientY: 100 }])
        );
      }

      expect(onRapidTouch).toHaveBeenCalledWith({ tapCount: 5 });
    });

    it("prevents default behavior when needed", () => {
      const preventDefault = vi.fn();

      render(
        <TouchOptimizedControls preventDefaultTouch={true}>
          <div data-testid="prevent-default">Prevent Default</div>
        </TouchOptimizedControls>
      );

      const target = screen.getByTestId("prevent-default");
      const touchEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);
      touchEvent.preventDefault = preventDefault;

      fireEvent(target, touchEvent);

      expect(preventDefault).toHaveBeenCalled();
    });
  });
});
