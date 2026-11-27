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
        const btnLogin = document.getElementById('btnLogin');
        const originalText = btnLogin.innerHTML;
        btnLogin.innerHTML = 'Verificando...';
        btnLogin.disabled = true;

        const email = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

        if (authError) {
            document.getElementById('loginError').textContent = "Error: " + authError.message;
            document.getElementById('loginError').style.display = 'block';
            btnLogin.innerHTML = originalText;
            btnLogin.disabled = false;
            return;
        }

        const { data: profileData, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', authData.user.id).single();

        if (profileError || !profileData) {
            alert("Error: No se encontró tu perfil. Contacta al administrador.");
            btnLogin.innerHTML = originalText;
            btnLogin.disabled = false;
            return;
        }

        currentUserRole = profileData.role;
        currentUserName = profileData.full_name;
        currentUserId = profileData.id;
        currentUserGroup = profileData.group_assigned || 'N/A';
        
        const avatarDisplay = document.getElementById('userAvatarDisplay');
        if (profileData.avatar_url) {
            avatarDisplay.src = profileData.avatar_url;
        } else {
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=0F2C59&color=fff`;
        }

        document.getElementById('loginError').style.display = 'none';
        loginView.classList.remove('active');
        dashboardView.classList.add('active');
        
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
        
        btnLogin.innerHTML = originalText;
        btnLogin.disabled = false;
    });

    window.logout = async () => {
        await supabaseClient.auth.signOut();
        closePortal();
    };

    // --- VALIDADOR DE ARCHIVOS ---
    const validateFile = (file, maxSizeMB, allowedTypes) => {
        if (!allowedTypes.includes(file.type)) {
            alert(`Formato no permitido. Sube solo: ${allowedTypes.join(', ')}`);
            return false;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`El archivo es muy pesado. El límite es ${maxSizeMB}MB.`);
            return false;
        }
        return true;
    };

    // --- SUBIR AVATAR ---
    document.getElementById('avatarUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        if(!validateFile(file, 2, ['image/jpeg', 'image/png', 'image/webp'])) {
            e.target.value = ''; // Limpiar input
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

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

    // --- ADMINISTRADOR ---
    window.toggleFormFields = () => {
        const role = document.getElementById('newRole').value;
        const teacherFields = document.getElementById('teacherSpecificFields');
        const studentFields = document.getElementById('studentSpecificFields');

        if (role === 'teacher') {
            teacherFields.style.display = 'block';
            studentFields.style.display = 'none';
            updateCoursesByGroup();
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

    // CREAR USUARIO (CON RESTAURACIÓN DE SESIÓN DE ADMIN)
    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btnCreateUser');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Creando cuenta...';
        btnSubmit.disabled = true;

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
            if(checkboxes.length === 0) {
                alert('Selecciona al menos un curso para el docente.');
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
                return;
            }
            coursesAssigned = Array.from(checkboxes).map(cb => cb.value).join(',');
        } else {
            paymentModality = document.getElementById('newPaymentModality').value;
            g1Name = document.getElementById('newGuardian1Name').value.trim();
            g1Phone = document.getElementById('newGuardian1Phone').value.trim();
            g2Name = document.getElementById('newGuardian2Name').value.trim();
            g2Phone = document.getElementById('newGuardian2Phone').value.trim();
        }

        try {
            // 1. Guardar la sesión del administrador actual
            const { data: { session: adminSession } } = await supabaseClient.auth.getSession();

            // 2. Crear el nuevo usuario
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

            // 3. Restaurar la sesión del administrador inmediatamente
            if (adminSession) {
                await supabaseClient.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token
                });
            }

            if (authError) {
                alert('Error de Supabase al crear usuario:\n' + authError.message);
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
                return;
            }

            // Verificar si Supabase exige confirmación por correo (authData.session es null)
            if (!authData.session) {
                alert('✅ Usuario creado en el sistema.\n\n⚠️ IMPORTANTE: Supabase ha enviado un correo de confirmación. El alumno no podrá iniciar sesión hasta que confirme su correo.');
            } else {
                alert('✅ Usuario creado y matriculado exitosamente.');
            }
            
            e.target.reset();
            loadUsersTable();
            updateCoursesByGroup(); // Resetear checkboxes
            toggleFormFields(); // Ocultar campos de docente

        } catch (error) {
            console.error(error);
            alert('Ocurrió un error inesperado al procesar la solicitud.');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });

    const loadUsersTable = async () => {
        const { data: users } = await supabaseClient.from('profiles').select('*').neq('role', 'admin');
        if (!users) return;
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            const roleLabel = u.role === 'teacher' ? 'Docente' : 'Estudiante';
            const detail = u.role === 'teacher' ? u.courses_assigned : `Grupo ${u.group_assigned}`;
            tbody.innerHTML += `
                <tr>
                    <td>${roleLabel}</td>
                    <td>${u.full_name}</td>
                    <td>${detail || 'N/A'}</td>
                    <td>
                        <button onclick="deleteUser('${u.id}', '${u.full_name}')" style="background:var(--burgundy); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; font-size:0.8rem;">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
    };

    // ELIMINAR USUARIO
    window.deleteUser = async (id, name) => {
        if(confirm(`¿Estás seguro de eliminar a ${name}?\n\nEsto borrará su acceso a la plataforma. Para borrar su correo definitivamente, ve a Supabase > Authentication.`)) {
            const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
            
            if (error) {
                alert('Error al eliminar: ' + error.message);
            } else {
                alert('Usuario eliminado de la plataforma correctamente.');
                loadUsersTable();
            }
        }
    };

    // GESTIÓN DE PAGOS
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
                    <td>${p.profiles ? p.profiles.full_name : 'Usuario Eliminado'}</td>
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
        input.accept = 'image/jpeg, image/png, image/webp';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            if(!validateFile(file, 2, ['image/jpeg', 'image/png', 'image/webp'])) return;
            
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

    // --- DOCENTE ---
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

    // --- ESTUDIANTE ---
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

        showTeacherNotebookTab('topics');
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
            date: new Date().toISOString().split('T')[0],
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

    const loadAttendance = async () => {
        const startDate = new Date('2027-01-11T00:00:00');
        const dates = [];
        let current = new Date(startDate);
        while(dates.length < 16) {
            if(current.getDay() === 1 || current.getDay() === 3) {
                dates.push(new Date(current).toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        const { data: students } = await supabaseClient.from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .eq('group_assigned', currentNotebookGroup)
            .order('full_name', { ascending: true });

        const { data: existingAttendance } = await supabaseClient.from('attendance')
            .select('*')
            .eq('course_name', currentNotebookCourse);

        const thead = document.getElementById('attendanceHead');
        let headHtml = '<tr><th>Apellidos y Nombres</th>';
        dates.forEach(d => { headHtml += `<th>${d.substring(5)}</th>`; });
        headHtml += '</tr>';
        thead.innerHTML = headHtml;

        const tbody = document.getElementById('attendanceBody');
        tbody.innerHTML = '';

        students.forEach(student => {
            let rowHtml = `<tr><td>${student.full_name}</td>`;
            dates.forEach(date => {
                const record = existingAttendance?.find(a => a.student_id === student.id && a.date === date);
                const statusClass = record ? record.status : '';
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
            newStatus = '';
            element.classList.remove('absent');
        } else {
            newStatus = 'present';
            element.classList.add('present');
        }

        if(newStatus === '') {
            await supabaseClient.from('attendance').delete().match({ student_id: studentId, course_name: currentNotebookCourse, date: date });
        } else {
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