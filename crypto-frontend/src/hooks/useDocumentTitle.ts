// src/hooks/useDocumentTitle.ts
import { useEffect } from 'react'

const APP_SUFFIX = ' · CryptoDash'

/**
 * Sets `document.title` for the lifetime of the component, restoring the
 * previous title on unmount. Pass a falsy title to skip the update.
 *
 * Example:
 *   useDocumentTitle('Markets')   // → "Markets · CryptoDash"
 */
export function useDocumentTitle(title: string | null | undefined) {
    useEffect(() => {
        if (!title) return
        const previous = document.title
        document.title = title.endsWith(APP_SUFFIX) ? title : `${title}${APP_SUFFIX}`
        return () => {
            document.title = previous
        }
    }, [title])
}
