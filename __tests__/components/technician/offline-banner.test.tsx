// ==============================================
// OfflineBanner COMPONENT TESTS
// ==============================================

import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineBanner } from '@/components/technician/offline-banner';

describe('OfflineBanner', () => {
  const defaultProps = {
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    onTriggerSync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when online with no pending changes', () => {
      const { container } = render(<OfflineBanner {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when offline', () => {
      render(<OfflineBanner {...defaultProps} isOnline={false} />);
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should render when online with pending changes', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={3} />);
      expect(screen.getByText(/3 changes waiting to sync/)).toBeInTheDocument();
    });

    it('should render when syncing', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={2} isSyncing={true} />);
      expect(screen.getByText(/syncing changes/i)).toBeInTheDocument();
    });
  });

  describe('Offline State', () => {
    it('should show offline message', () => {
      render(<OfflineBanner {...defaultProps} isOnline={false} />);
      expect(screen.getByText(/offline — changes will sync when reconnected/i)).toBeInTheDocument();
    });

    it('should not show sync button when offline', () => {
      render(<OfflineBanner {...defaultProps} isOnline={false} pendingCount={5} />);
      expect(screen.queryByText('Sync now')).not.toBeInTheDocument();
    });

    it('should use amber styling when offline', () => {
      const { container } = render(<OfflineBanner {...defaultProps} isOnline={false} />);
      const banner = container.firstChild as HTMLElement;
      expect(banner.className).toContain('amber');
    });
  });

  describe('Pending Changes State', () => {
    it('should show singular "change" for 1 pending', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={1} />);
      expect(screen.getByText('1 change waiting to sync')).toBeInTheDocument();
    });

    it('should show plural "changes" for multiple pending', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={5} />);
      expect(screen.getByText('5 changes waiting to sync')).toBeInTheDocument();
    });

    it('should show sync button when online with pending changes', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={3} />);
      expect(screen.getByText('Sync now')).toBeInTheDocument();
    });

    it('should call onTriggerSync when sync button is clicked', () => {
      const onTriggerSync = jest.fn();
      render(<OfflineBanner {...defaultProps} pendingCount={3} onTriggerSync={onTriggerSync} />);

      fireEvent.click(screen.getByText('Sync now'));
      expect(onTriggerSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Syncing State', () => {
    it('should show syncing message', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={2} isSyncing={true} />);
      expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
    });

    it('should not show sync button while syncing', () => {
      render(<OfflineBanner {...defaultProps} pendingCount={2} isSyncing={true} />);
      expect(screen.queryByText('Sync now')).not.toBeInTheDocument();
    });
  });
});
