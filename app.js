document.addEventListener('DOMContentLoaded', () => {
    const FIM_DO_PERIODO = "2025-09-30"
    const PONTES = []
    const FERIADOS = []
    const STORAGE_KEY = 'calculadoraSaidaState'

    const formatTime = (value) => {
        const nums = value.replace(/[^\d]/g, '')
        const hours = nums.slice(0, 2).padStart(2, '0')
        const minutes = nums.slice(2, 4).padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const elements = {
        jornada: document.getElementById('jornada'),
        entrada: document.getElementById('entrada'),
        intervalo: document.getElementById('intervalo'),
        saldoNegativo: document.getElementById('saldo-negativo'),
        tempoPersonalizado: document.getElementById('tempo-personalizado'),
        intervaloWrapper: document.getElementById('intervalo-wrapper'),
        resetPersonalizadoBtn: document.getElementById('reset-personalizado-btn'),
        saidaNormalLabel: document.getElementById('saida-normal-label'),
        saidaNormal: document.getElementById('saida-normal'),
        saida11min: document.getElementById('saida-11-min'),
        saida2horas: document.getElementById('saida-2-horas'),
        saidaPersonalizada: document.getElementById('saida-personalizada'),
        diasUteis: document.getElementById('dias-uteis'),
        totalDevedor: document.getElementById('total-devedor'),
        pagarPorDia: document.getElementById('pagar-por-dia'),
        fimPeriodo: document.getElementById('fim-periodo'),
        listaPontes: document.getElementById('lista-pontes'),
        listaFeriados: document.getElementById('lista-feriados'),
    }

    let pagarPorDiaSugeridoMinutos = 0

    const parseTimeToMinutes = (time) => {
        if (!time) return 0
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
    }

    const formatMinutesToTime = (totalMinutes) => {
        if (isNaN(totalMinutes) || totalMinutes === null) return '--:--'
        const absMinutes = Math.abs(totalMinutes)
        const hours = Math.floor(absMinutes / 60)
        const minutes = Math.round(absMinutes % 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    const saveState = () => {
        const state = {
            jornada: elements.jornada.value,
            entrada: elements.entrada.value,
            intervalo: elements.intervalo.value,
            saldoNegativo: elements.saldoNegativo.value,
            tempoPersonalizado: elements.tempoPersonalizado.value,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }

    const loadState = () => {
        const savedStateJSON = localStorage.getItem(STORAGE_KEY)
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON)
            elements.jornada.value = savedState.jornada || '8'
            elements.entrada.value = savedState.entrada || ''
            elements.intervalo.value = savedState.intervalo || '01:00'
            elements.saldoNegativo.value = savedState.saldoNegativo || '00:00'
            elements.tempoPersonalizado.value = savedState.tempoPersonalizado || '00:00'
        }
    }

    const calcularTudo = () => {
        const jornadaHoras = parseInt(elements.jornada.value, 10)
        const jornadaMinutos = jornadaHoras * 60
        const entradaMinutos = parseTimeToMinutes(elements.entrada.value)
        const saldoNegativoMinutos = parseTimeToMinutes(elements.saldoNegativo.value)

        if (!elements.entrada.value) {
            saveState()
            return
        }

        let intervaloNormalMinutos, intervaloExtraMinutos
        if (jornadaHoras === 6) {
            intervaloNormalMinutos = 15
            intervaloExtraMinutos = 30
        } else {
            const intervaloUsuarioMinutos = parseTimeToMinutes(elements.intervalo.value)
            intervaloNormalMinutos = intervaloUsuarioMinutos
            intervaloExtraMinutos = intervaloUsuarioMinutos
        }

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const pontesFuturas = PONTES.filter(p => new Date(`${p}T12:00:00`) >= hoje)
        const holidaysSet = new Set([...PONTES, ...FERIADOS])

        let diasUteisRestantes = 0
        if (FIM_DO_PERIODO) {
            let diaCorrente = new Date(hoje)
            const fimPeriodoDate = new Date(`${FIM_DO_PERIODO}T12:00:00`)

            while (diaCorrente <= fimPeriodoDate) {
                const diaDaSemana = diaCorrente.getDay()
                const dataISO = diaCorrente.toISOString().split('T')[0]
                if (diaDaSemana !== 0 && diaDaSemana !== 6 && !holidaysSet.has(dataISO)) {
                    diasUteisRestantes++
                }
                diaCorrente.setDate(diaCorrente.getDate() + 1)
            }
        }

        const pontesMinutos = pontesFuturas.length * jornadaMinutos
        const totalDevedorMinutos = saldoNegativoMinutos + pontesMinutos

        pagarPorDiaSugeridoMinutos = diasUteisRestantes > 0 ? Math.ceil(totalDevedorMinutos / diasUteisRestantes) : 0

        const baseSaidaNormalMinutos = entradaMinutos + jornadaMinutos + intervaloNormalMinutos
        const baseSaidaExtraMinutos = entradaMinutos + jornadaMinutos + intervaloExtraMinutos

        const saidaNormalRange = `${formatMinutesToTime(baseSaidaNormalMinutos - 10)} - ${formatMinutesToTime(baseSaidaNormalMinutos + 10)}`
        const saida11Minutos = baseSaidaExtraMinutos + 11
        const saida2HorasMinutos = baseSaidaExtraMinutos + 120

        const tempoPersonalizadoMinutos = parseTimeToMinutes(elements.tempoPersonalizado.value)
        const saidaPersonalizadaMinutos = baseSaidaExtraMinutos + tempoPersonalizadoMinutos

        elements.diasUteis.textContent = diasUteisRestantes
        elements.totalDevedor.textContent = formatMinutesToTime(totalDevedorMinutos)
        elements.pagarPorDia.textContent = formatMinutesToTime(pagarPorDiaSugeridoMinutos)

        elements.saidaNormal.textContent = saidaNormalRange
        elements.saida11min.textContent = formatMinutesToTime(saida11Minutos)
        elements.saida2horas.textContent = formatMinutesToTime(saida2HorasMinutos)
        elements.saidaPersonalizada.textContent = formatMinutesToTime(saidaPersonalizadaMinutos)

        saveState()
    }

    const resetarCampoPersonalizado = () => {
        elements.tempoPersonalizado.value = formatMinutesToTime(pagarPorDiaSugeridoMinutos)
        calcularTudo()
    }

    const handleJornadaChange = () => {
        const jornada = elements.jornada.value
        if (jornada === '6') {
            elements.intervaloWrapper.classList.add('hidden')
            elements.saidaNormalLabel.textContent = 'Normal (15 min)'
        } else {
            elements.intervaloWrapper.classList.remove('hidden')
            elements.saidaNormalLabel.textContent = 'Normal'
        }
        calcularTudo()
        resetarCampoPersonalizado()
    }

    const displayPeriodData = () => {
        const formatDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR')

        elements.fimPeriodo.textContent = formatDate(FIM_DO_PERIODO)
        elements.listaPontes.innerHTML = PONTES.length > 0 ? PONTES.map(p => `<li>${formatDate(p)}</li>`).join('') : '<li>Nenhuma</li>'
        elements.listaFeriados.innerHTML = FERIADOS.length > 0 ? FERIADOS.map(f => `<li>${formatDate(f)}</li>`).join('') : '<li>Nenhum</li>'
    }

    const init = () => {
        loadState()
        displayPeriodData()

        elements.jornada.addEventListener('change', handleJornadaChange)

        elements.resetPersonalizadoBtn.addEventListener('click', resetarCampoPersonalizado)

        elements.saldoNegativo.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            e.preventDefault()

            const [hoursStr, minutesStr] = e.target.value.split(':')
            let hours = parseInt(hoursStr, 10)
            let minutes = parseInt(minutesStr, 10)
            const cursorPos = e.target.selectionStart

            if (cursorPos <= 2) {
                hours = e.key === 'ArrowUp' ? hours + 1 : hours - 1
                if (hours < 0) hours = 0
            } else {
                minutes = e.key === 'ArrowUp' ? minutes + 1 : minutes - 1

                if (minutes > 59) {
                    minutes = 0
                    hours += 1
                }
                if (minutes < 0) {
                    minutes = 59
                    if (hours > 0) hours -= 1
                }
            }
            const newHours = String(hours).padStart(2, '0')
            const newMinutes = String(minutes).padStart(2, '0')
            e.target.value = `${newHours}:${newMinutes}`
            e.target.setSelectionRange(cursorPos, cursorPos)
            calcularTudo()
            resetarCampoPersonalizado()
        })

        elements.saldoNegativo.addEventListener('input', e => {
            const cleanValue = e.target.value.replace(/[^\d]/g, '')
            let formattedValue = cleanValue

            if (cleanValue.length > 2) {
                formattedValue = `${cleanValue.slice(0, 2)}:${cleanValue.slice(2, 4)}`
            }

            e.target.value = formattedValue

            calcularTudo()
            resetarCampoPersonalizado()
        })

        elements.saldoNegativo.addEventListener('blur', (e) => {
            e.target.value = formatTime(e.target.value)
        })

        ;[elements.entrada, elements.intervalo, elements.saldoNegativo, elements.tempoPersonalizado].forEach(el => {
            el.addEventListener('input', () => {
                calcularTudo()
            })
        })

        handleJornadaChange()
    }

    init()
})
