function openFormularioModal() {
    var loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) {
        loginModal.hide();
    }
  
    var myModal = new bootstrap.Modal(document.getElementById('modal'));
    myModal.show();
  }
  
  function closeFormularioModal() {
    var myModal = bootstrap.Modal.getInstance(document.getElementById('modal'));
    myModal.hide();
  }
  
  function openLoginModal() {
    var formularioModal = bootstrap.Modal.getInstance(document.getElementById('modal'));
    if (formularioModal) {
        formularioModal.hide();
    }
  
    var modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
  }
  
  function closeLoginModal() {
    var modalEl = document.getElementById('loginModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
  }
  
  function validarLogin() {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
  
    if (!email || !senha) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
  
    alert('Login enviado!');
  }
  
  
  // Função para buscar o endereço pelo CEP
  function buscarEndereco() {
    var cep = document.getElementById('cep').value.replace('-', ''); 
    if (cep.length === 8) { 
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
          if (!data.erro) {
            document.getElementById('rua').value = data.logradouro;
            document.getElementById('bairro').value = data.bairro;
            document.getElementById('cidade').value = data.localidade;
            document.getElementById('estado').value = data.uf;
            document.getElementById('pais').value = "Brasil";
            document.getElementById('rua').readOnly = true;
            document.getElementById('bairro').readOnly = true;
            document.getElementById('cidade').readOnly = true;
            document.getElementById('estado').readOnly = true;
            document.getElementById('pais').readOnly = true;
          } else{
            document.getElementById('rua').value = '';
            document.getElementById('bairro').value = '';
            document.getElementById('cidade').value = '';
            document.getElementById('estado').value = '';
            document.getElementById('pais').value = '';
            document.getElementById('rua').readOnly = false;
            document.getElementById('bairro').readOnly = false;
            document.getElementById('cidade').readOnly = false;
            document.getElementById('estado').readOnly = false;
            document.getElementById('pais').readOnly = false;
          }
        })
        .catch(error => {
          console.error('Erro ao buscar o CEP:', error);
          alert('Ocorreu um erro ao buscar o CEP. Tente novamente.');
        });
    }
  }
  
    function verificarDocumento() {
      const valor = document.getElementById('cpf_cnpj').value.replace(/\D/g, '');
    
      if (valor.length === 11) {
        if (!validarCPF(valor)) {
          alert("CPF inválido.");
        }
      } else if (valor.length === 14) {
        if (!validarCNPJ(valor)) {
          alert("CNPJ inválido.");
          return;
        }
        consultarCNPJ(valor);
      }
    }
    
  
    function validarCPF(cpf) {
      cpf = cpf.replace(/[^\d]+/g, '');
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
      let soma = 0;
      for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
      let resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(cpf.charAt(9))) return false;
  
      soma = 0;
      for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      return resto === parseInt(cpf.charAt(10));
    }
  
    function validarCNPJ(cnpj) {
      cnpj = cnpj.replace(/[^\d]+/g, '');
      if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  
      let t = cnpj.length - 2, d = cnpj.substring(t), d1 = parseInt(d.charAt(0)), d2 = parseInt(d.charAt(1));
      let calc = x => {
        let n = cnpj.substring(0, x), y = x - 7, s = 0, r = 0;
        for (let i = x; i >= 1; i--) {
          s += n.charAt(x - i) * y--;
          if (y < 2) y = 9;
        }
        r = 11 - (s % 11);
        return r > 9 ? 0 : r;
      };
      return calc(t) === d1 && calc(t + 1) === d2;
    }
  
    function consultarDocumento() {
      const campo = document.getElementById('cpf_cnpj');
      const nomeCampo = document.getElementById('nome');
      const cepCampo = document.getElementById('cep');
      const numeroCampo = document.getElementById('numero');
      const logradouroCampo = document.getElementById('rua');
      const bairroCampo = document.getElementById('bairro');
      const cidadeCampo = document.getElementById('cidade');
      const estadoCampo = document.getElementById('estado');
      const paisCampo = document.getElementById('pais');
      const tipoCampo = document.getElementById('tipo');
      const valor = campo.value.replace(/\D/g, '');
    
      campo.classList.remove('is-invalid', 'is-valid');
      nomeCampo.value = '';
      cepCampo.value = '';
      numeroCampo.value = '';
      logradouroCampo.value = '';
      bairroCampo.value = '';
      cidadeCampo.value = '';
      estadoCampo.value = '';
      paisCampo.value = '';
    
      if (valor.length === 11) {
        // Validação CPF
        if (validarCPF(valor)) {
              tipoCampo.value = "C" || '';
              tipoCampo.options[0].disabled = true;
              tipoCampo.options[1].disabled = true;
          campo.classList.add('is-valid');
        } else {
          campo.classList.add('is-invalid');
        }
      } else if (valor.length === 14) {
        // Validação CNPJ
        if (validarCNPJ(valor)) {
          campo.classList.add('is-valid');
          fetch(`https://brasilapi.com.br/api/cnpj/v1/${valor}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
              nomeCampo.value = data.razao_social || '';
              cepCampo.value = data.cep || ''; 
              numeroCampo.value = data.numero || ''; 
              logradouroCampo.value = data.logradouro || ''; 
              bairroCampo.value = data.bairro || '';
              cidadeCampo.value = data.municipio || '';
              estadoCampo.value = data.uf || '';
              paisCampo.value = 'Brasil';
            })
            .catch(() => {
              alert('Erro ao buscar as informações do CNPJ. Verifique a conexão.');
              nomeCampo.value = '';
              telefoneCampo.value = '';
              cepCampo.value = '';
              numeroCampo.value = '';
              logradouroCampo.value = '';
              bairroCampo.value = '';
              cidadeCampo.value = '';
              estadoCampo.value = '';
              paisCampo.value = '';
            });
        } else {
          campo.classList.add('is-invalid');
        }
      }
    }  
    function irParaAba(index) {
      const navLinks = ['pills-tab1-tab', 'pills-tab2-tab', 'pills-tab3-tab'];
      const tabTrigger = new bootstrap.Tab(document.getElementById(navLinks[index]));
      tabTrigger.show();
    
      // Atualizar barra de progresso
      const progressBar = document.getElementById('progressBar');
      const porcentagens = [33, 66, 100];
      progressBar.style.width = porcentagens[index] + '%';
      progressBar.setAttribute('aria-valuenow', porcentagens[index]);
    }

    function formatarDocumento(campo) {
      let valor = campo.value.replace(/\D/g, ''); // Remove tudo o que não é dígito
  
      if (valor.length <= 11) { // Formatação de CPF
          valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
          valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
          valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else { // Formatação de CNPJ
          valor = valor.substring(0, 14); // Limita ao tamanho máximo de CNPJ
          valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
          valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
          valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
      }
      campo.value = valor;
  }
  function atualizarCampoDocumento(campo) {
      formatarDocumento(campo);
      if (campo.value.length === 14 || campo.value.length === 18) {
      consultarDocumento();
      }
  }
   // MatheusO: Abre o Login após o POST do cadastro 
    window.addEventListener('DOMContentLoaded', function () {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('showLoginModal') === 'true') {
        openLoginModal();
      }
    });