import type {
  ListCallOptions,
  QueryConfig,
  SearchCallOptions,
  UseFilesOptions,
} from "files-sdk/react"
import { isNativeFileRef, type SendRequest, type Transport } from "files-sdk/client"
import * as FilesReact from "files-sdk/react"

type FileStorageClientOptions = {
  /**
   * URL of the storage gateway, such as `http://localhost:3000/files`. Requests to it carry the
   * session cookie.
   */
  endpoint: string
}

function checkIsGatewayRequest(endpoint: string, requestUrl: string) {
  const request = new URL(requestUrl, endpoint)
  const gateway = new URL(endpoint)
  return request.origin === gateway.origin && request.pathname === gateway.pathname
}

function getUploadBody(request: SendRequest): XMLHttpRequestBodyInit | null {
  if (!request.body) return null
  if (isNativeFileRef(request.body))
    throw new TypeError("React Native file references require the React Native client")

  if (!request.fields) return request.body

  const form = new FormData()
  for (const [key, value] of Object.entries(request.fields)) form.append(key, value)
  form.append("file", request.body instanceof Blob ? request.body : new Blob([request.body]))
  return form
}

function createTransport(endpoint: string): Transport {
  return (request) =>
    // oxlint-disable-next-line promise/avoid-new -- XMLHttpRequest is callback-based.
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      function abort() {
        xhr.abort()
      }
      function cleanup() {
        request.signal?.removeEventListener("abort", abort)
      }

      xhr.open(request.method, request.url, true)
      xhr.withCredentials = checkIsGatewayRequest(endpoint, request.url)

      if (request.headers && !request.fields) {
        for (const [key, value] of Object.entries(request.headers)) xhr.setRequestHeader(key, value)
      }

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) request.onProgress?.(event.loaded, event.total)
      })
      xhr.addEventListener("load", () => {
        cleanup()
        resolve({ status: xhr.status, text: xhr.responseText })
      })
      xhr.addEventListener("error", () => {
        cleanup()
        reject(new Error("File upload failed"))
      })
      xhr.addEventListener("abort", () => {
        cleanup()
        reject(new DOMException("File upload aborted", "AbortError"))
      })

      if (request.signal?.aborted) {
        reject(new DOMException("File upload aborted", "AbortError"))
        return
      }

      request.signal?.addEventListener("abort", abort, { once: true })
      xhr.send(getUploadBody(request))
    })
}

const fetchWithCredentials = Object.assign(
  (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: "include" }),
  fetch
)

/**
 * Builds React hooks bound to the storage gateway. An application calls it once in a `shared`
 * module and imports the hooks from there.
 */
export function createFileStorageClient({ endpoint }: FileStorageClientOptions) {
  const config = { endpoint, fetchImpl: fetchWithCredentials, transport: createTransport(endpoint) }

  function useFiles(options?: UseFilesOptions) {
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

  return { useFile, useFiles, useList, useSearch }
}
