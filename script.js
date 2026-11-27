// =====================================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================================
const SUPABASE_URL = 'https://xabokyvrtwfbgxqmlnvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f7dsq-vGuaAz-29RAC8tzQ_vFZO4G7L';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Constantes de Cursos
const COURSES_GROUP_C = ["Álgebra", "Aritmética", "Competencia Comunicativa", "Historia", "Geografía", "Economía", "Educación Cívica"];
const COURSES_GROUP_D = ["Álgebra", "Aritmética", "Competencia Comunicativa", "Historia", "Geografía", "Filosofía", "Educación Cívica"];
const ALL_COURSES = [...new Set([...COURSES_GROUP_C, ...COURSES_GROUP_D])];

document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI Y NAVEGACIÓN GENERAL ---
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('active')));

    // --- FORMULARIO DE CONTACTO ---
    document.getElementById('leadForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const group = document.getElementById('group').value;
        const message = document.getElementById('message').value;

        const waNumber = "51944565542";
        const waText = `¡Hola Los Peripatéticos! Quiero información.%0A%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Correo:* ${email}%0A*Interés:* ${group}%0A*Consulta:* ${message}`;
        window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
        e.target.reset();
    });

    // --- LÓGICA DEL PORTAL (MODAL) ---
    const portalModal = document.getElementById('portalModal');
    const loginView = document.getElementById('loginView');
    const dashboardView = document.getElementById('dashboardView');
    
    window.openPortal = () => {
        portalModal.classList.add('active');
        loginView.classList.add('active');
        dashboardView.classList.remove('active');
        document.body.style.overflow = 'hidden';
    };

    window.closePortal = () => {
        portalModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    };

    // --- VARIABLES DE SESIÓN ---
    let currentUserRole = '';
    let currentUserName = '';
    let currentUserId = '';
    let currentUserGroup = '';
    let currentUserCourses = [];
    let currentNotebookCourse = '';
    let currentNotebookGroup = '';

    // --- LOGIN ---
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

        if (authError) {
            document.getElementById('loginError').textContent = "Error: " + authError.message;
            document.getElementById('loginError').style.display = 'block';
            return;
        }

        const { data: profileData, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', authData.user.id).single();

        if (profileError || !profileData) {
            alert("Error: No se encontró tu perfil. Contacta al administrador.");
            return;
        }

        currentUserRole = profileData.role;
        currentUserName = profileData.full_name;
        currentUserId = profileData.id;
        currentUserGroup = profileData.group_assigned || 'N/A';
        
        // Configurar Avatar
        const avatarDisplay = document.getElementById('userAvatarDisplay');
        if (profileData.avatar_url) {
            avatarDisplay.src = profileData.avatar_url;
        } else {
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=0F2C59&color=fff`;
        }

        document.getElementById('loginError').style.display = 'none';
        loginView.classList.remove('active');
        dashboardView.classList.add('active');
        
        // UI Dashboard Header
        document.getElementById('userNameDisplay').textContent = currentUserName;
        let roleText = currentUserRole === 'admin' ? 'Administrador' : (currentUserRole === 'teacher' ? 'Docente' : 'Estudiante');
        document.getElementById('userRoleDisplay').textContent = roleText;
        
        const groupDisplay = document.getElementById('userGroupDisplay');
        if (currentUserRole !== 'admin' && currentUserGroup !== 'N/A') {
            groupDisplay.textContent = 'Grupo: ' + currentUserGroup;
            groupDisplay.style.display = 'inline-block';
        } else {
            groupDisplay.style.display = 'none';
        }
        
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('teacherPanel').style.display = 'none';
        document.getElementById('studentPanel').style.display = 'none';
        document.getElementById('mainDashboardView').style.display = 'block';
        document.getElementById('notebookView').style.display = 'none';

        if (currentUserRole === 'admin') {
            document.getElementById('adminPanel').style.display = 'block';
            loadUsersTable();
            loadPaymentsTable();
        } else if (currentUserRole === 'teacher') {
            document.getElementById('teacherPanel').style.display = 'block';
            currentUserCourses = profileData.courses_assigned ? profileData.courses_assigned.split(',') : [];
            renderTeacherNotebooks();
        } else {
            document.getElementById('studentPanel').style.display = 'block';
            renderStudentNotebooks();
            loadStudentPayments();
        }
    });

    window.logout = async () => {
        await supabaseClient.auth.signOut();
        closePortal();
    };

    // --- SUBIR AVATAR ---
    document.getElementById('avatarUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Mostrar carga
        document.getElementById('userAvatarDisplay').style.opacity = '0.5';

        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, file);

        if (uploadError) {
            alert('Error al subir imagen: ' + uploadError.message);
            document.getElementById('userAvatarDisplay').style.opacity = '1';
            return;
        }

        const { data } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
        
        await supabaseClient.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', currentUserId);
        
        document.getElementById('userAvatarDisplay').src = data.publicUrl;
        document.getElementById('userAvatarDisplay').style.opacity = '1';
        alert('Foto actualizada correctamente.');
    });

    // --- ADMINISTRADOR: LÓGICA DE FORMULARIO DINÁMICO ---
    window.toggleFormFields = () => {
        const role = document.getElementById('newRole').value;
        const teacherFields = document.getElementById('teacherSpecificFields');
        const studentFields = document.getElementById('studentSpecificFields');

        if (role === 'teacher') {
            teacherFields.style.display = 'block';
            studentFields.style.display = 'none';
            updateCoursesByGroup(); // Populate checkboxes
        } else {
            teacherFields.style.display = 'none';
            studentFields.style.display = 'block';
        }
    };

    window.updateCoursesByGroup = () => {
        const role = document.getElementById('newRole').value;
        if (role !== 'teacher') return;

        const group = document.getElementById('newGroup').value;
        let coursesToDisplay = [];
        
        if (group === 'C') coursesToDisplay = COURSES_GROUP_C;
        else if (group === 'D') coursesToDisplay = COURSES_GROUP_D;
        else coursesToDisplay = ALL_COURSES;

        const container = document.getElementById('teacherCourseCheckboxes');
        container.innerHTML = '';
        
        coursesToDisplay.forEach(course => {
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <label style="display: flex; align-items: center; gap: 10px; font-family: var(--font-ui); font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" value="${course}" class="teacher-course-check">
                    ${course}
                </label>
            `;
            container.appendChild(div);
        });
    };

    // ADMIN: Crear Usuario
    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('newRole').value;
        const group = document.getElementById('newGroup').value;
        const name = document.getElementById('newName').value.trim();
        const dob = document.getElementById('newDob').value;
        const email = document.getElementById('newEmail').value.trim();
        const phone = document.getElementById('newPhone').value.trim();
        const pass = document.getElementById('newPass').value;
        
        let coursesAssigned = '';
        let paymentModality = '';
        let g1Name = '', g1Phone = '', g2Name = '', g2Phone = '';

        if (role === 'teacher') {
            const checkboxes = document.querySelectorAll('.teacher-course-check:checked');
            if(checkboxes.length === 0) return alert('Selecciona al menos un curso para el docente.');
            coursesAssigned = Array.from(checkboxes).map(cb => cb.value).join(',');
        } else {
            paymentModality = document.getElementById('newPaymentModality').value;
            g1Name = document.getElementById('newGuardian1Name').value.trim();
            g1Phone = document.getElementById('newGuardian1Phone').value.trim();
            g2Name = document.getElementById('newGuardian2Name').value.trim();
            g2Phone = document.getElementById('newGuardian2Phone').value.trim();
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: { 
                data: { 
                    full_name: name, role: role, group_assigned: group, birth_date: dob, phone: phone,
                    guardian1_name: g1Name, guardian1_phone: g1Phone, guardian2_name: g2Name, guardian2_phone: g2Phone,
                    payment_modality: paymentModality, courses_assigned: coursesAssigned
                } 
            }
        });

        if (authError) return alert('Error al crear usuario: ' + authError.message);

        alert('¡Usuario creado exitosamente!\n\n(El sistema cerrará tu sesión por seguridad. Vuelve a entrar).');
        await supabaseClient.auth.signOut();
        closePortal();
    });

    const loadUsersTable = async () => {
        const { data: users } = await supabaseClient.from('profiles').select('*').neq('role', 'admin');
        if (!users) return;
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            const roleLabel = u.role === 'teacher' ? 'Docente' : 'Estudiante';
            const detail = u.role === 'teacher' ? u.courses_assigned : `Grupo ${u.group_assigned}`;
            tbody.innerHTML += `<tr><td>${roleLabel}</td><td>${u.full_name}</td><td>${detail || 'N/A'}</td><td>${u.phone}</td></tr>`;
        });
    };

    // ADMIN: Gestión de Pagos
    window.showAdminTab = (tab) => {
        document.querySelectorAll('#adminPanel .admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#adminPanel .tab-btn').forEach(b => b.classList.remove('active'));
        if(tab === 'users') {
            document.getElementById('adminUsersTab').classList.add('active');
            document.querySelectorAll('#adminPanel .tab-btn')[0].classList.add('active');
        } else {
            document.getElementById('adminPaymentsTab').classList.add('active');
            document.querySelectorAll('#adminPanel .tab-btn')[1].classList.add('active');
        }
    };

    const loadPaymentsTable = async () => {
        const { data: payments } = await supabaseClient.from('payments').select('*, profiles(full_name)').order('due_date');
        if (!payments) return;
        const tbody = document.querySelector('#paymentsTable tbody');
        tbody.innerHTML = '';
        payments.forEach(p => {
            const statusClass = p.status === 'paid' ? 'status-paid' : 'status-pending';
            const actionBtn = p.status === 'pending' 
                ? `<button onclick="uploadReceipt('${p.id}')" class="btn-primary" style="padding:5px 10px; font-size:0.75rem;">Subir Comprobante</button>`
                : `<a href="${p.receipt_url}" target="_blank" style="color:var(--navy); text-decoration:underline; font-size:0.8rem;">Ver Comprobante</a>`;

            tbody.innerHTML += `
                <tr>
                    <td>${p.profiles.full_name}</td>
                    <td>${p.installment}</td>
                    <td>S/ ${p.amount.toFixed(2)}</td>
                    <td>${new Date(p.due_date).toLocaleDateString()}</td>
                    <td><span class="payment-status ${statusClass}">${p.status === 'paid' ? 'Pagado' : 'Pendiente'}</span></td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    };

    window.uploadReceipt = async (paymentId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${paymentId}-${Date.now()}.${fileExt}`;
            
            const { error } = await supabaseClient.storage.from('receipts').upload(fileName, file);
            if(error) return alert('Error al subir comprobante: ' + error.message);
            
            const { data } = supabaseClient.storage.from('receipts').getPublicUrl(fileName);
            
            await supabaseClient.from('payments').update({ status: 'paid', receipt_url: data.publicUrl }).eq('id', paymentId);
            alert('Pago registrado y comprobante subido correctamente.');
            loadPaymentsTable();
        };
        input.click();
    };


    // --- DOCENTE: CUADERNOS ---
    const renderTeacherNotebooks = () => {
        const grid = document.getElementById('teacherNotebooksGrid');
        grid.innerHTML = '';
        
        if(currentUserCourses.length === 0) {
            grid.innerHTML = '<p class="empty-msg">No tienes cursos asignados. Contacta al administrador.</p>';
            return;
        }

        currentUserCourses.forEach(course => {
            grid.innerHTML += `
                <div class="notebook-card" onclick="openNotebook('${course}', '${currentUserGroup}')">
                    <i class="fas fa-book"></i>
                    <h4>${course}</h4>
                    <span>Cuaderno Virtual</span>
                </div>
            `;
        });
    };

    // --- ESTUDIANTE: CUADERNOS ---
    window.showStudentTab = (tab) => {
        document.querySelectorAll('#studentPanel .student-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#studentPanel .tab-btn').forEach(b => b.classList.remove('active'));
        
        if(tab === 'courses') {
            document.getElementById('studentCoursesTab').classList.add('active');
            document.querySelectorAll('#studentPanel .tab-btn')[0].classList.add('active');
        } else {
            document.getElementById('studentPaymentsTab').classList.add('active');
            document.querySelectorAll('#studentPanel .tab-btn')[1].classList.add('active');
            loadStudentPayments();
        }
    };

    const renderStudentNotebooks = () => {
        const grid = document.getElementById('studentNotebooksGrid');
        grid.innerHTML = '';
        
        let coursesToDisplay = currentUserGroup === 'C' ? COURSES_GROUP_C : COURSES_GROUP_D;

        coursesToDisplay.forEach(course => {
            grid.innerHTML += `
                <div class="notebook-card" onclick="openNotebook('${course}', '${currentUserGroup}')">
                    <i class="fas fa-book"></i>
                    <h4>${course}</h4>
                    <span>Cuaderno Virtual</span>
                </div>
            `;
        });
    };

    // --- ESTUDIANTE: PAGOS ---
    const loadStudentPayments = async () => {
        const { data: payments } = await supabaseClient.from('payments').select('*').eq('student_id', currentUserId).order('due_date');
        const container = document.getElementById('studentPaymentsList');
        container.innerHTML = '';

        if(!payments || payments.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay registros de pago.</p>';
            return;
        }

        payments.forEach(p => {
            const statusClass = p.status === 'paid' ? 'paid' : 'pending';
            const statusText = p.status === 'paid' ? 'Pagado' : 'Pendiente de Pago';
            const receiptLink = p.receipt_url ? `<a href="${p.receipt_url}" target="_blank" style="font-size:0.8rem; color:var(--navy); text-decoration:underline;">Ver comprobante</a>` : '';
            
            container.innerHTML += `
                <div class="payment-card ${statusClass}">
                    <div class="payment-info">
                        <h5>${p.installment}</h5>
                        <p>Vencimiento: ${new Date(p.due_date).toLocaleDateString()} | Monto: S/ ${p.amount.toFixed(2)}</p>
                        ${receiptLink}
                    </div>
                    <div>
                        <span class="payment-status status-${p.status}">${statusText}</span>
                    </div>
                </div>
            `;
        });
    };


    // --- VISTA INTERNA DEL CUADERNO ---
    window.openNotebook = (courseName, group) => {
        currentNotebookCourse = courseName;
        currentNotebookGroup = group;
        
        document.getElementById('mainDashboardView').style.display = 'none';
        document.getElementById('notebookView').style.display = 'block';
        document.getElementById('notebookTitle').textContent = courseName;
        document.getElementById('notebookGroup').textContent = `Grupo ${group}`;

        if (currentUserRole === 'teacher' || currentUserRole === 'admin') {
            document.getElementById('notebookTeacherControls').style.display = 'block';
        } else {
            document.getElementById('notebookTeacherControls').style.display = 'none';
        }

        showTeacherNotebookTab('topics'); // Default tab
        loadTopics();
    };

    window.closeNotebook = () => {
        document.getElementById('mainDashboardView').style.display = 'block';
        document.getElementById('notebookView').style.display = 'none';
    };

    window.showTeacherNotebookTab = (tab) => {
        const tabs = document.querySelectorAll('#notebookTeacherControls .tab-btn');
        if(tabs.length > 0) {
            tabs.forEach(t => t.classList.remove('active'));
            if(tab === 'topics') tabs[0].classList.add('active');
            else tabs[1].classList.add('active');
        }

        if(tab === 'topics') {
            document.getElementById('topicsView').style.display = 'block';
            document.getElementById('attendanceView').style.display = 'none';
        } else {
            document.getElementById('topicsView').style.display = 'none';
            document.getElementById('attendanceView').style.display = 'block';
            loadAttendance();
        }
    };

    // TEMAS (Cargar y Crear)
    const loadTopics = async () => {
        const { data: topics } = await supabaseClient.from('course_topics')
            .select('*')
            .eq('course_name', currentNotebookCourse)
            .eq('group_area', currentNotebookGroup)
            .order('session_number', { ascending: true });
        
        const container = document.getElementById('topicsList');
        container.innerHTML = '';
        
        if(!topics || topics.length === 0) {
            container.innerHTML = '<p class="empty-msg">Aún no hay temas publicados en este cuaderno.</p>';
            return;
        }

        topics.forEach(t => {
            const fileLink = t.file_url ? `<a href="${t.file_url}" target="_blank"><i class="fas fa-file-download"></i> Descargar Material</a>` : '';
            const extLink = t.link_url ? `<a href="${t.link_url}" target="_blank"><i class="fas fa-link"></i> Enlace Externo</a>` : '';
            
            container.innerHTML += `
                <div class="topic-card">
                    <h5>Sesión ${t.session_number}: ${t.title}</h5>
                    <div class="meta">
                        <span><i class="far fa-calendar-alt"></i> ${new Date(t.date).toLocaleDateString()}</span>
                    </div>
                    <p>${t.description}</p>
                    <div class="topic-links">
                        ${extLink}
                        ${fileLink}
                    </div>
                </div>
            `;
        });
    };

    document.getElementById('addTopicForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const session = document.getElementById('topicSession').value;
        const title = document.getElementById('topicTitle').value;
        const desc = document.getElementById('topicDesc').value;
        const link = document.getElementById('topicLink').value;
        const file = document.getElementById('topicFile').value;

        const { error } = await supabaseClient.from('course_topics').insert([{
            course_name: currentNotebookCourse,
            group_area: currentNotebookGroup,
            title: title,
            description: desc,
            session_number: session,
            date: new Date().toISOString().split('T')[0], // Fecha actual
            file_url: file,
            link_url: link,
            created_by: currentUserId
        }]);

        if(error) alert('Error: ' + error.message);
        else {
            alert('Tema publicado correctamente.');
            e.target.reset();
            loadTopics();
        }
    });

    // ASISTENCIA
    const loadAttendance = async () => {
        // Generar fechas (Lunes y Miércoles simulados para el ejemplo del ciclo 2027)
        // En producción real, el día de la semana vendría de la configuración del curso.
        // Aquí simularemos 8 semanas de clases (16 fechas).
        const startDate = new Date('2027-01-11T00:00:00'); // Lunes 11 de Enero 2027
        const dates = [];
        let current = new Date(startDate);
        // Simulamos que el curso es Lunes y Miércoles
        while(dates.length < 16) {
            if(current.getDay() === 1 || current.getDay() === 3) { // 1=Lunes, 3=Miércoles
                dates.push(new Date(current).toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        // Cargar estudiantes del grupo
        const { data: students } = await supabaseClient.from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .eq('group_assigned', currentNotebookGroup)
            .order('full_name', { ascending: true }); // Orden alfabético

        // Cargar asistencia existente
        const { data: existingAttendance } = await supabaseClient.from('attendance')
            .select('*')
            .eq('course_name', currentNotebookCourse);

        // Renderizar Cabecera
        const thead = document.getElementById('attendanceHead');
        let headHtml = '<tr><th>Apellidos y Nombres</th>';
        dates.forEach(d => {
            headHtml += `<th>${d.substring(5)}</th>`; // Muestra solo MM-DD
        });
        headHtml += '</tr>';
        thead.innerHTML = headHtml;

        // Renderizar Cuerpo
        const tbody = document.getElementById('attendanceBody');
        tbody.innerHTML = '';

        students.forEach(student => {
            let rowHtml = `<tr><td>${student.full_name}</td>`;
            
            dates.forEach(date => {
                // Buscar si ya tiene registro
                const record = existingAttendance?.find(a => a.student_id === student.id && a.date === date);
                const statusClass = record ? record.status : ''; // 'present', 'absent' o ''
                
                rowHtml += `
                    <td>
                        <div class="attendance-dot ${statusClass}" 
                             onclick="toggleAttendance('${student.id}', '${date}', this)"
                             title="Clic para cambiar estado"></div>
                    </td>
                `;
            });
            rowHtml += '</tr>';
            tbody.innerHTML += rowHtml;
        });
    };

    window.toggleAttendance = async (studentId, date, element) => {
        let newStatus = '';
        if(element.classList.contains('present')) {
            newStatus = 'absent';
            element.classList.remove('present');
            element.classList.add('absent');
        } else if(element.classList.contains('absent')) {
            newStatus = ''; // Limpiar registro
            element.classList.remove('absent');
        } else {
            newStatus = 'present';
            element.classList.add('present');
        }

        if(newStatus === '') {
            // Eliminar registro si se desmarca
            await supabaseClient.from('attendance').delete().match({ student_id: studentId, course_name: currentNotebookCourse, date: date });
        } else {
            // Upsert (Insertar o Actualizar)
            await supabaseClient.from('attendance').upsert({ 
                student_id: studentId, 
                course_name: currentNotebookCourse, 
                date: date, 
                status: newStatus,
                created_by: currentUserId
            }, { onConflict: 'student_id, course_name, date' });
        }
    };

    document.querySelectorAll('.btn-portal').forEach(btn => btn.addEventListener('click', openPortal));
});