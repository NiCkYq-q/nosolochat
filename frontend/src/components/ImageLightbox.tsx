type ImageLightboxProps = {
  imageUrl: string;
  onClose: () => void;
};

export default function ImageLightbox({ imageUrl, onClose }: ImageLightboxProps) {
  return (
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      onClick={onClose}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <img
        className="lightbox-image"
        src={imageUrl}
        alt="Изображение в сообщении"
        onClick={(event) => {
          event.stopPropagation();
        }}
      />
    </div>
  );
}
