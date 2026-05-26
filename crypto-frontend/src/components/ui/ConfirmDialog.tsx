// src/components/ui/ConfirmDialog.tsx
import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmLabel?: string
    loading?: boolean
}

export function ConfirmDialog({
    open, onClose, onConfirm, title, message,
    confirmLabel = 'Confirm',
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onClose} title={title}>
            <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-400" />
                </div>
                <p className="text-sm text-gray-300 leading-relaxed pt-1">
                    {message}
                </p>
            </div>
            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={onConfirm}
                    loading={loading}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    )
}
