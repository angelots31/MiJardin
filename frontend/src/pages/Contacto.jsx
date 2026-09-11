function Contacto() {
  return (
    <main className="pagina mx-auto w-full">
      <p className="eyebrow">Estamos para ayudarte</p>
      <h1>Contacto</h1>
      <p>Si tienes preguntas sobre flores, pedidos, floristerías aliadas o el funcionamiento de la plataforma, puedes comunicarte con MiJardín.</p>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#23392E]/10">
          <h2 className="text-xl font-bold text-[#23392E]">Información de contacto</h2>
          <ul className="contacto-info mt-4">
            <li>📧 Correo: mijardin@gmail.com</li>
            <li>📞 Teléfono: +57 312 345 6789</li>
            <li>📍 Medellín, Antioquia, Colombia</li>
            <li>🌷 Atención para clientes y floristerías aliadas</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-[#F1E7D6] p-6">
          <h2 className="text-xl font-bold text-[#23392E]">¿En qué podemos ayudarte?</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            <li>• Información sobre productos y ramos.</li>
            <li>• Orientación sobre compras y entregas.</li>
            <li>• Información para floristerías que quieran participar.</li>
            <li>• Reporte de inconvenientes o sugerencias para mejorar MiJardín.</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[#7C9473]/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[#23392E]">Queremos escuchar tus ideas</h2>
        <p className="mt-2 leading-7">MiJardín está pensado para crecer junto con sus usuarios. Las sugerencias sobre nuevas flores, tiendas, formas de personalizar ramos y mejoras en el servicio de entrega pueden ayudar a construir una experiencia más completa.</p>
      </section>
    </main>
  );
}

export default Contacto;
