export const CLOUDINARY_CLOUD_NAME = 'dwx96nlxw';
export const CLOUDINARY_UPLOAD_PRESET = 'san_pham_preset';

export const uploadImageToCloudinary = async (imageUri) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const data = await response.json();
  if (!data.secure_url) throw new Error('Upload thất bại');
  return data.secure_url;
};