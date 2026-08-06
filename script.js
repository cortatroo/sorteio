// ====== CONFIGURAÇÃO ======
const API_URL = 'https://script.google.com/macros/s/AKfycbxrnREO2T6QDzRl-WLIoPP-DysW7pyIkWwQf2I5SXzUM70RMBr215FS-ZxJbCq7phy-/exec';
// ==========================

// Elementos do DOM
const elAppContent = document.getElementById('app-content');
const elLoading = document.getElementById('loading-state');
const elFrase = document.getElementById('resultado-frase');
const elData = document.getElementById('resultado-data');
const elId = document.getElementById('resultado-id');
const btnSortear = document.getElementById('btn-sortear');
const btnReset = document.getElementById('btn-reset');

const elProgresso = document.getElementById('progress-bar');
const elStatSorteadas = document.getElementById('stat-sorteadas');
const elStatRestantes = document.getElementById('stat-restantes');
const elStatPercent = document.getElementById('stat-percentual');
const elHistorico = document.getElementById('lista-historico');

let estadoGlobal = null;

// Inicialização
document.addEventListener('DOMContentLoaded', carregarDados);

// Requisição genérica (GET e POST)
async function fetchAPI(acao = null) {
    try {
        let config = {};
        // Se houver ação, envia como POST em texto puro para evitar conflitos de CORS (Preflight)
        if (acao) {
            config = {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({ acao })
            };
        }
        
        const response = await fetch(API_URL, config);
        const data = await response.json();
        
        if (data.erro) throw new Error(data.erro);
        return data;
        
    } catch (error) {
        console.error("Erro na API:", error);
        alert("Ocorreu um erro de conexão. Tente novamente.");
        return null;
    }
}

// Carregar estado inicial
async function carregarDados() {
    elLoading.style.display = 'flex';
    elAppContent.style.display = 'none';
    
    estadoGlobal = await fetchAPI(); // GET request
    
    if (estadoGlobal) {
        atualizarInterface();
        elLoading.style.display = 'none';
        elAppContent.style.display = 'block';
    }
}

// Atualizar toda a tela com base nos dados do backend
function atualizarInterface() {
    const stats = estadoGlobal.estatisticas;
    const ultimo = estadoGlobal.ultimo_sorteio;
    
    // Atualizar Barra de Progresso
    elProgresso.style.width = `${stats.percentual}%`;
    elStatSorteadas.textContent = `${stats.sorteadas} sorteadas`;
    elStatRestantes.textContent = `${stats.restantes} restantes`;
    elStatPercent.textContent = `${stats.percentual}%`;
    
    // Atualizar Cartão Principal
    if (ultimo) {
        elId.textContent = `ID: ${ultimo.id}`;
        elId.classList.remove('hidden');
        elFrase.textContent = ultimo.frase;
        
        const dataFormatada = new Date(ultimo.data).toLocaleString('pt-BR');
        elData.textContent = `Sorteado em: ${dataFormatada}`;
    } else {
        elId.classList.add('hidden');
        elFrase.textContent = "Nenhuma frase sorteada neste ciclo.";
        elData.textContent = "Clique abaixo para começar.";
    }
    
    // Atualizar Botão Sortear
    if (stats.terminou) {
        btnSortear.textContent = "REINICIAR CICLO";
        btnSortear.onclick = reiniciarCiclo;
        elFrase.textContent = "Todas as frases foram sorteadas!";
        elData.textContent = "";
        elId.classList.add('hidden');
    } else if (stats.restantes === 1) {
        btnSortear.textContent = "SORTEAR ÚLTIMA FRASE";
        btnSortear.onclick = realizarSorteio;
    } else {
        btnSortear.textContent = "SORTEAR";
        btnSortear.onclick = realizarSorteio;
    }
    
    // Atualizar Histórico (invertido para o mais recente aparecer no topo, se desejar. O prompt pediu ordenado pela ORDEM)
    elHistorico.innerHTML = '';
    if (estadoGlobal.historico.length === 0) {
        elHistorico.innerHTML = '<li style="color: #757575; justify-content: center;">Histórico vazio</li>';
    } else {
        estadoGlobal.historico.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.frase;
            elHistorico.appendChild(li);
        });
    }
}

// Função de Sorteio com animação de Roleta
async function realizarSorteio() {
    // Bloquear UI
    btnSortear.disabled = true;
    btnSortear.textContent = "SORTEANDO...";
    btnReset.disabled = true;
    
    // Iniciar animação "Roleta"
    elFrase.classList.add('roulette-anim');
    elId.classList.add('hidden');
    elData.textContent = "Aguarde...";
    
    // Textos fictícios piscando durante a chamada
    const textosTemporarios = ["Analisando opções...", "Misturando...", "Selecionando...", "Quase lá..."];
    let roletaIndex = 0;
    const roletaInterval = setInterval(() => {
        elFrase.textContent = textosTemporarios[roletaIndex % textosTemporarios.length];
        roletaIndex++;
    }, 300);

    // Faz a chamada à API no background (simulando também um tempo mínimo de 2s para UX)
    const [novoEstado] = await Promise.all([
        fetchAPI('sortear'),
        new Promise(resolve => setTimeout(resolve, 2000)) // Garante no mínimo 2 segundos de roleta
    ]);

    // Parar animação
    clearInterval(roletaInterval);
    elFrase.classList.remove('roulette-anim');
    
    btnSortear.disabled = false;
    btnReset.disabled = false;

    if (novoEstado) {
        estadoGlobal = novoEstado;
        atualizarInterface();
    }
}

// Função para Reiniciar o ciclo
async function reiniciarCiclo() {
    const confirmacao = confirm("Atenção: Isso irá apagar todo o histórico de sorteios atuais e reiniciar o ciclo. Deseja continuar?");
    
    if (!confirmacao) return;
    
    btnSortear.disabled = true;
    btnReset.disabled = true;
    btnReset.textContent = "LIMPANDO...";
    
    const novoEstado = await fetchAPI('reset');
    
    btnSortear.disabled = false;
    btnReset.disabled = false;
    btnReset.textContent = "REINICIAR CICLO";
    
    if (novoEstado) {
        estadoGlobal = novoEstado;
        atualizarInterface();
    }
}