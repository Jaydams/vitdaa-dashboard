import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ResponsiveLayout } from "@/components/responsive/ResponsiveLayout";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const mockChildren = (
  <div data-testid="dashboard-content">Dashboard Content</div>
);

describe("ResponsiveLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Desktop layout", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it("renders desktop layout for large screens", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("responsive-layout")).toHaveClass(
        "desktop-layout"
      );
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });

    it("shows sidebar by default on desktop", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("sidebar")).toBeVisible();
      expect(screen.getByTestId("sidebar")).not.toHaveClass("collapsed");
    });

    it("allows sidebar toggle on desktop", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const toggleButton = screen.getByTestId("sidebar-toggle");
      fireEvent.click(toggleButton);

      expect(screen.getByTestId("sidebar")).toHaveClass("collapsed");
    });
  });

  describe("Mobile layout", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Mock mobile media query
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes("max-width: 768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it("renders mobile layout for small screens", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("responsive-layout")).toHaveClass(
        "mobile-layout"
      );
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });

    it("hides sidebar by default on mobile", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("sidebar")).not.toBeVisible();
    });

    it("shows mobile navigation toggle", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("mobile-nav-toggle")).toBeInTheDocument();
    });

    it("opens sidebar when mobile toggle is clicked", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const mobileToggle = screen.getByTestId("mobile-nav-toggle");
      fireEvent.click(mobileToggle);

      expect(screen.getByTestId("sidebar")).toBeVisible();
      expect(screen.getByTestId("sidebar")).toHaveClass("mobile-open");
    });

    it("closes sidebar when clicking outside on mobile", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      // Open sidebar first
      const mobileToggle = screen.getByTestId("mobile-nav-toggle");
      fireEvent.click(mobileToggle);

      // Click outside
      const overlay = screen.getByTestId("mobile-overlay");
      fireEvent.click(overlay);

      expect(screen.getByTestId("sidebar")).not.toBeVisible();
    });
  });

  describe("Tablet layout", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches:
          query.includes("max-width: 1024px") &&
          !query.includes("max-width: 768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it("renders tablet layout for medium screens", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("responsive-layout")).toHaveClass(
        "tablet-layout"
      );
    });

    it("shows collapsible sidebar on tablet", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("sidebar")).toHaveClass("collapsible");
    });
  });

  describe("Responsive behavior", () => {
    it("adapts to window resize events", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      // Start with desktop
      expect(screen.getByTestId("responsive-layout")).toHaveClass(
        "desktop-layout"
      );

      // Resize to mobile
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      fireEvent(window, new Event("resize"));

      expect(screen.getByTestId("responsive-layout")).toHaveClass(
        "mobile-layout"
      );
    });

    it("maintains state during layout transitions", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      // Collapse sidebar on desktop
      const toggleButton = screen.getByTestId("sidebar-toggle");
      fireEvent.click(toggleButton);

      expect(screen.getByTestId("sidebar")).toHaveClass("collapsed");

      // Resize to tablet - should maintain collapsed state
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      fireEvent(window, new Event("resize"));

      expect(screen.getByTestId("sidebar")).toHaveClass("collapsed");
    });
  });

  describe("Touch interactions", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it("supports swipe gestures to open sidebar", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const layout = screen.getByTestId("responsive-layout");

      // Simulate swipe right gesture
      fireEvent.touchStart(layout, {
        touches: [{ clientX: 0, clientY: 100 }],
      });

      fireEvent.touchMove(layout, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(layout, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      expect(screen.getByTestId("sidebar")).toBeVisible();
    });

    it("supports swipe gestures to close sidebar", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      // Open sidebar first
      const mobileToggle = screen.getByTestId("mobile-nav-toggle");
      fireEvent.click(mobileToggle);

      const sidebar = screen.getByTestId("sidebar");

      // Simulate swipe left gesture
      fireEvent.touchStart(sidebar, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchMove(sidebar, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(sidebar, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      expect(screen.getByTestId("sidebar")).not.toBeVisible();
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels for navigation", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      expect(screen.getByTestId("sidebar")).toHaveAttribute(
        "aria-label",
        "Main navigation"
      );
      expect(screen.getByTestId("sidebar-toggle")).toHaveAttribute(
        "aria-label",
        "Toggle navigation"
      );
    });

    it("manages focus properly when opening mobile sidebar", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const mobileToggle = screen.getByTestId("mobile-nav-toggle");
      fireEvent.click(mobileToggle);

      // Focus should move to first focusable element in sidebar
      const firstNavItem = screen.getByTestId("first-nav-item");
      expect(firstNavItem).toHaveFocus();
    });

    it("traps focus within mobile sidebar when open", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      // Open sidebar
      const mobileToggle = screen.getByTestId("mobile-nav-toggle");
      fireEvent.click(mobileToggle);

      // Tab should cycle within sidebar
      const lastNavItem = screen.getByTestId("last-nav-item");
      lastNavItem.focus();

      fireEvent.keyDown(lastNavItem, { key: "Tab" });

      const firstNavItem = screen.getByTestId("first-nav-item");
      expect(firstNavItem).toHaveFocus();
    });

    it("supports keyboard navigation", () => {
      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const toggleButton = screen.getByTestId("sidebar-toggle");
      toggleButton.focus();

      fireEvent.keyDown(toggleButton, { key: "Enter" });

      expect(screen.getByTestId("sidebar")).toHaveClass("collapsed");
    });
  });

  describe("Performance", () => {
    it("debounces resize events", () => {
      const resizeHandler = vi.fn();
      render(
        <ResponsiveLayout onResize={resizeHandler}>
          {mockChildren}
        </ResponsiveLayout>
      );

      // Trigger multiple resize events quickly
      for (let i = 0; i < 10; i++) {
        fireEvent(window, new Event("resize"));
      }

      // Should only call handler once after debounce
      setTimeout(() => {
        expect(resizeHandler).toHaveBeenCalledTimes(1);
      }, 300);
    });

    it("uses CSS transforms for smooth animations", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ResponsiveLayout>{mockChildren}</ResponsiveLayout>);

      const sidebar = screen.getByTestId("sidebar");
      expect(sidebar).toHaveStyle("transition: transform 0.3s ease-in-out");
    });
  });
});
