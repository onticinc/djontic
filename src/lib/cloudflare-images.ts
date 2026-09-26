const ACCOUNT_ID = () => process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
const API_TOKEN = () => process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim() || "";
const DELIVERY_URL = () =>
  process.env.CLOUDFLARE_IMAGES_DELIVERY_URL?.trim().replace(/\/$/, "") || "";

export function isCloudflareImagesConfigured() {
  return Boolean(ACCOUNT_ID() && API_TOKEN() && DELIVERY_URL());
}

export function cloudflareImagesConfigError() {
  if (isCloudflareImagesConfigured()) return null;
  return "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_API_TOKEN, and CLOUDFLARE_IMAGES_DELIVERY_URL in .env.";
}

export type UploadedImage = {
  id: string;
  url: string;
};

function deliveryUrlFor(imageId: string, variant = "public") {
  return `${DELIVERY_URL()}/${imageId}/${variant}`;
}

export async function uploadImageToCloudflare(
  file: File | Blob,
  filename = "upload.jpg",
): Promise<UploadedImage> {
  const accountId = ACCOUNT_ID();
  const token = API_TOKEN();
  if (!accountId || !token || !DELIVERY_URL()) {
    throw new Error(
      cloudflareImagesConfigError() || "Cloudflare Images is not configured.",
    );
  }

  const form = new FormData();
  form.append("file", file, filename);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    },
  );

  const data = (await response.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: {
      id?: string;
      variants?: string[];
    };
  };

  if (!response.ok || !data.success || !data.result?.id) {
    const message =
      data.errors?.map((error) => error.message).filter(Boolean).join(" ") ||
      "Cloudflare Images upload failed.";
    throw new Error(message);
  }

  const id = data.result.id;
  const url =
    data.result.variants?.find((variant) => variant.includes("/public")) ||
    deliveryUrlFor(id);

  return { id, url };
}
