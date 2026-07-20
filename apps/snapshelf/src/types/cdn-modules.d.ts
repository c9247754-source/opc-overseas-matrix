declare module "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm" {
  export function removeBackground(
    image: File | Blob | ImageData | string | URL,
    config?: Record<string, unknown>
  ): Promise<Blob>;
}
