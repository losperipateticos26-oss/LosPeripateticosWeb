document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Efecto de la barra de navegación (Sticky Header)
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
        // Cambiar icono
        const icon = mobileMenuBtn.querySelector('i');
        if(navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Cerrar menú al hacer clic en un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
        });
    });

    // 3. Animaciones al hacer Scroll (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // 4. Manejo del Formulario (Redirección a WhatsApp)
    const form = document.getElementById('leadForm');
    const formMessage = document.getElementById('formMessage');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Obtener valores
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const group = document.getElementById('group').value;

        // Número de WhatsApp (código de Perú + número)
        const waNumber = "51944565542"; 
        
        // Construir el mensaje con formato
        const waMessage = `*¡Hola Academia Los Peripatéticos!* 🦉📚%0A%0AEstoy interesado(a) en inscribirme al *Ciclo Verano*.%0A%0A*Mis datos:*%0A👤 *Nombre:* ${name}%0A📱 *Celular:* ${phone}%0A🎓 *Grupo de interés:* ${group}%0A%0AQuedo a la espera de más información para completar mi matrícula.`;
        
        const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

        // Feedback visual al usuario
        formMessage.textContent = "¡Datos registrados! Redirigiendo a WhatsApp para confirmar tu matrícula...";
        formMessage.classList.add('success');
        
        // Deshabilitar botón temporalmente
        const btn = form.querySelector('button');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        btn.disabled = true;

        form.reset();

        // Redirigir a WhatsApp después de un breve delay
        setTimeout(() => {
            window.open(waUrl, '_blank');
            
            // Restaurar botón y ocultar mensaje después de un tiempo
            setTimeout(() => {
                formMessage.classList.remove('success');
                formMessage.textContent = "";
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }, 3000);
        }, 1000);
    });
});