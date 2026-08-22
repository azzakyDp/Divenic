export const LOCAL_ASSETS = {
  logo: 'asset/logo.png',
  placeholder: 'asset/icons/person.png'
};

// Render image and placeholder image
export function getPlaceholder() {
  return LOCAL_ASSETS.placeholder;
}

export function optimazeCloudinary(url, width = 100, height = 100) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  return url.replace(`/upload/`, `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`)
}