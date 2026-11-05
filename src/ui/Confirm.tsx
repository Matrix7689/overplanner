import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { create } from "zustand";
import { Button } from "./Button";

type Request = {
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

const useConfirmStore = create<{ request: Request | null }>(() => ({ request: null }));

// Asks in a styled dialog instead of the browser's confirm(). Resolves true if
// confirmed. <ConfirmHost /> in the Layout renders it.
export function confirmDialog(options: Omit<Request, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    // A newer question replaces one still open (a quick double Esc can do this),
    // which counts as a "no", so whoever asked first isn't left waiting.
    useConfirmStore.getState().request?.resolve(false);
    useConfirmStore.setState({ request: { ...options, resolve } });
  });
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);

  const finish = (ok: boolean) => {
    request?.resolve(ok);
    useConfirmStore.setState({ request: null });
  };

  return (
    <AlertDialog.Root open={request !== null} onOpenChange={(open) => !open && finish(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="data-[state=open]:animate-overlay-show fixed inset-0 z-[80] bg-(--overlay-bg) backdrop-blur-sm" />
        <AlertDialog.Content className="pop-shadow data-[state=open]:animate-content-show fixed top-1/2 left-1/2 z-[90] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5">
          <AlertDialog.Title className="text-base font-semibold text-title">{request?.title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm text-caption">{request?.description}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={request?.danger ? "danger" : "solid"} size="sm" onClick={() => finish(true)}>
                {request?.confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
