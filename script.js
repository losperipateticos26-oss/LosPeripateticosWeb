document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cambiar el estilo de la barra de navegación al hacer scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Menú Hamburguesa para móviles
    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en un enlace (en móviles)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // 3. Manejo del Formulario de Contacto (Simulación de Envío)
    const form = document.getElementById('leadForm');
    const formMessage = document.getElementById('formMessage');

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Previene recargar la página

        // Obtener valores
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const group = document.getElementById('group').value;

        // Aquí puedes integrar un servicio como Formspree, EmailJS o enviar a un backend.
        // Por ahora, simularemos un envío exitoso y redirigiremos a WhatsApp con los datos.
        
        // Construir mensaje para WhatsApp
        const waNumber = "51944565542"; // Número de Perú con código de país
        const waMessage = `¡Hola Academia Los Peripatéticos! Deseo inscribirme.%0A%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Correo:* ${email}%0A*Grupo:* ${group}`;
        const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

        // Mostrar mensaje de éxito
        form.reset();
        formMessage.textContent = "¡Datos registrados! Redirigiendo a WhatsApp para confirmar tu matrícula...";
        formMessage.classList.add('success');

        // Redirigir a WhatsApp después de 1.5 segundos
        setTimeout(() => {
            window.open(waUrl, '_blank');
            formMessage.classList.remove('success');
            formMessage.textContent = "";
        }, 1500);
    });
});