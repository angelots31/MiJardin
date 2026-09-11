// Componente flotante reutilizable. Cambia el número por el real de MiJardín.
const NUMERO_WHATSAPP = '+573044761403';
const MENSAJE = 'Hola MiJardín, quisiera más información sobre sus flores.';

function WhatsAppButton() {
  const href = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.7 4.61 1.902 6.478L4 29l7.73-1.865A11.94 11.94 0 0 0 16.001 27C22.629 27 28 21.627 28 15S22.629 3 16.001 3Zm0 21.818a9.77 9.77 0 0 1-4.984-1.363l-.358-.213-4.588 1.107 1.13-4.472-.234-.367A9.77 9.77 0 0 1 5.273 15c0-5.917 4.811-10.727 10.728-10.727S26.729 9.083 26.729 15 21.918 24.818 16.001 24.818Zm5.914-7.87c-.324-.163-1.917-.946-2.214-1.053-.297-.108-.513-.163-.729.163-.216.324-.837 1.053-1.026 1.27-.189.216-.378.243-.702.081-.324-.163-1.368-.504-2.606-1.607-.963-.859-1.614-1.92-1.803-2.244-.189-.324-.02-.5.143-.662.146-.146.324-.378.486-.567.163-.19.216-.325.324-.541.108-.216.054-.406-.027-.568-.081-.163-.729-1.757-.999-2.406-.263-.632-.53-.546-.729-.556-.189-.01-.405-.012-.621-.012-.216 0-.567.081-.864.406-.297.324-1.134 1.108-1.134 2.702s1.161 3.132 1.323 3.348c.163.216 2.286 3.49 5.539 4.895.774.334 1.377.534 1.848.683.776.247 1.482.212 2.041.129.623-.093 1.917-.784 2.187-1.541.27-.757.27-1.406.189-1.541-.081-.135-.297-.216-.621-.379Z"/>
      </svg>
    </a>
  );
}

export default WhatsAppButton;