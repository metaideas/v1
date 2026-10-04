import type {
  ListCallOptions,
  QueryConfig,
  SearchCallOptions,
  UseFilesOptions,
} from "files-sdk/react"
import * as FilesReact from "files-sdk/react"

type UploadStorageClientOptions = {
  /**
   * URL of the storage gateway, such as `http://localhost:3000/files`.
   */
  endpoint: string
  /**
   * Returns an access token from the auth server, such as `authClient.token()` from
   * `@v1/auth/client`. The client asks for a fresh token on every gateway call, so a call always
   * acts as the current session, even after a sign-in or sign-out in another tab.
   */
  getToken: () => Promise<string>
}

/**
 * Builds React hooks bound to the storage gateway. An application calls it once in a `shared`
 * module and imports the hooks from there. Uploads and downloads go directly to the bucket through
 * signed URLs, and only the gateway calls carry the access token.
 */
export function createUploadStorageClient({ endpoint, getToken }: UploadStorageClientOptions) {
  const config = {
    endpoint,
    headers: async () => ({ authorization: `Bearer ${await getToken()}` }),
  }

  function useUpload(options?: UseFilesOptions) {
    return FilesReact.useFiles({ ...options, ...config })
  }

  function useFile(key: string | undefined, options?: QueryConfig) {
    return FilesReact.useFile(key, { ...options, ...config })
  }

  function useList(listOptions?: ListCallOptions, options?: QueryConfig) {
    return FilesReact.useList(listOptions, { ...options, ...config })
  }

  function useSearch(
    pattern: string | RegExp | undefined,
    searchOptions?: SearchCallOptions,
    options?: QueryConfig
  ) {
    return FilesReact.useSearch(pattern, searchOptions, { ...options, ...config })
  }

  return { useFile, useList, useSearch, useUpload }
}
