function QuienesSomos() {
  return (
    <main className="pagina mx-auto w-full">
      <p className="eyebrow">Nuestra historia</p>
      <h1>¿Quiénes somos?</h1>
      <p>MiJardín comenzó como un pequeño catálogo para conocer y organizar diferentes flores, pero evolucionó hacia una propuesta digital que conecta clientes, floristerías físicas y repartidores.</p>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-[#7C9473]/20 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#23392E]">Nuestra misión</h2>
          <p className="mt-2 text-sm leading-6">Facilitar la compra de flores y ramos desde casa, dando visibilidad a negocios locales y ofreciendo una experiencia sencilla y personalizada.</p>
        </article>
        <article className="rounded-2xl border border-[#7C9473]/20 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#23392E]">Nuestra visión</h2>
          <p className="mt-2 text-sm leading-6">Convertir a MiJardín en un punto de encuentro digital para floristerías y personas que buscan regalar, decorar o crear sus propios ramos.</p>
        </article>
        <article className="rounded-2xl border border-[#7C9473]/20 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#23392E]">Nuestra propuesta</h2>
          <p className="mt-2 text-sm leading-6">Reunir catálogos de distintas tiendas para que el cliente pueda comparar, combinar productos y solicitar una entrega coordinada.</p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl bg-[#F1E7D6] p-6">
        <h2 className="text-2xl font-bold text-[#23392E]">¿Qué hace diferente a MiJardín?</h2>
        <p className="mt-3 leading-7">La plataforma no busca reemplazar a las floristerías físicas. Su objetivo es acercarlas al cliente mediante una experiencia digital: cada tienda conserva sus productos y puede mostrarlos en línea, mientras MiJardín facilita la exploración, la selección, el armado del pedido y la coordinación del reparto.</p>
      </section>
    </main>
  );
}

export default QuienesSomos;
