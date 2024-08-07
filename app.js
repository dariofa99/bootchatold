const { createBot, createProvider, createFlow, addKeyword, EVENTS, addAnswer } = require('@bot-whatsapp/bot');

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const axios = require('axios'); /**Libreria para realizar peticiones */
const { v4: uuidv4 } = require('uuid'); // libreria para generar el uuid dinamico --npm install uuid--
const nodemailer = require("nodemailer");
const miObjetoGlobal = {};
require('dotenv').config();
const { google } = require('googleapis');

/**INICIO CONEXION APP MOVIL*/
// Función para enviar datos a la nueva API utilizando los datos recogidos por el bot
async function enviarDatosANuevaAPI() {
    const url = 'https://backend.alercom.org/api/v1/events/webservice/store'; 
    const emergencia = labels.emergencia[miObjetoGlobal.emergencia];
    
    // Verifica si la emergencia es válida antes de continuar
    if (!emergencia) {
        console.error("La emergencia especificada no es válida:", miObjetoGlobal.emergencia);
        return;  // Puedes manejar el error como mejor consideres
    }

    const payload = {
        event_description: miObjetoGlobal.pregunta3 || "Descripción del evento aquí",
        event_date: obtenerFechaActual().slice(0, 10),
        event_place: miObjetoGlobal.pregunta2 || "Ubicación no especificada",
        event_aditional_information: null,
        town_id: 1,
        data: [
            {
                question: "tipos_de_alerta",
                options: [
                    { value: miObjetoGlobal.pregunta1 === "1" ? "Alerta" : "Emergencia", option: miObjetoGlobal.pregunta1 === "1" ? "alerta" : "emergencia" }
                ]
            },
            {
                question: "caracteristica_de_la_alerta",
                options: [
                    { value: emergencia, option: emergencia.toLowerCase().replace(/ /g, "_") }
                ]
            },
            {
                question: "tipos_de_afectaciones",
                options: miObjetoGlobal.pregunta4.map(num => ({
                    value: labels.pregunta4[num],
                    option: labels.pregunta4[num].toLowerCase().replace(/ /g, "_")
                }))
            },
            {
                question: "numero_de_afectados",
                options: [
                    { value: "Especificar rango", option: "especificar_rango" }
                ]
            }
        ]
    };

    try {
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Datos enviados correctamente a la nueva API:', response.data);
    } catch (error) {
        console.error('Error al enviar datos a la nueva API:', error);
    }
}

/**INICIO CAPTURA DE IMAGEN */
/*
const fs = require('fs');
const path = require('path');
*/

// Función para descargar la imagen desde una URL y guardarla temporalmente
/*
async function getImageBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'];
    return `data:${mimeType};base64,${base64Image}`;
}*/

/**FIN CAPTURA DE IMAGEN  */

/**Inicio de geocodificacion inversa */
const googleApiKey = 'AIzaSyBhvC7UAoNDk_d1jN7uGxaKpkDEnbacEqM'; // Reemplaza con tu clave de API de Google Maps

async function geocodeLocation(lat, lon) {
    try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleApiKey}`);
        if (response.data.status !== 'OK') {
            throw new Error('No se pudo obtener una respuesta válida de la API de Google Maps');
        }

        const results = response.data.results;
        if (!results || results.length === 0) {
            throw new Error('No se encontraron resultados para la ubicación proporcionada');
        }

        const addressComponents = results[0].address_components;
        if (!addressComponents) {
            throw new Error('No se pudieron obtener los componentes de la dirección');
        }

        let municipio = 'No disponible';
        let departamento = 'No disponible';

        addressComponents.forEach(component => {
            if (component.types.includes('administrative_area_level_2')) {
                municipio = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
                departamento = component.long_name;
            }
        });

        miObjetoGlobal.municipio = municipio;
        miObjetoGlobal.departamento = departamento;

        console.log(`Municipio: ${miObjetoGlobal.municipio}, Departamento: ${miObjetoGlobal.departamento}`);
    } catch (error) {
        console.error('Error al obtener la información de ubicación:', error);
        throw new Error('No se pudo obtener la información de la ubicación, por favor intenta nuevamente.');
    }
}
/**Fin geocodificacion inversa version free*/

/**Envio de SMS proveedor Vonage */
/*
const { Vonage } = require('@vonage/server-sdk')

const vonage = new Vonage({
  apiKey: "TU_PI",
  apiSecret: "TU_API_SECRET_DE _VONAGE"
})

const from = "Vonage APIs"
const to = "573209429629"
const text = 'A text message sent using the Vonage SMS API'

async function sendSMS() {
    await vonage.sms.send({to, from, text})
        .then(resp => { console.log('Message sent successfully'); console.log(resp); })
        .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
}

sendSMS();
*/

/**MAPA API */
function createGoogleMapsLink(lat, long) {
    return `https://www.google.com/maps/?q=${lat},${long}`;
}

function createMapUrl(lat, long) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${long}&zoom=14&size=600x300&maptype=roadmap&markers=color:red%7Clabel:S%7C${lat},${long}&key=${apiKey}`;
}

/**FIN MAPA API */

/**
 * CAMBIO ETIQUETAS AMIGABLES
 */

/**Clave valor formateo */
const etiquetasAmigables = {
  pregunta1: 'Tipo de reporte',
  emergencia: 'Evento',
  pregunta2latitud: 'Latitud',
  pregunta2longitud: 'Longitud',
  pregunta2: 'Ubicación',
  pregunta3: 'Identificador del evento',
  pregunta4: 'Afectados',
  fin: 'Fin del reporte',
  telefono: 'Número de contacto de la persona que reporta el evento'///'Teléfono de contacto'
};

const labels = {
  pregunta1: {
      '1': "Alerta",
      '2': "Emergencia"
  },
  emergencia: {
      '1': "Incendio",
      '2': "Inundación"
  },
  alerta: {
      '1': "Incendio forestal",
      '2': "Inundación por cuerpo de agua"
  },
  pregunta4: {
      '1': "Personas",
      '2': "Animales",
      '3': "Cultivos",
      '4': "Viviendas",
      '5': "Otra infraestructura",
      '6': "Ninguno"
  },
  fin: {
      '9': "Fin del reporte"
  }
};

/**FIN CAMBIO ETIQUETAS AMIGABLES */

function formatResponse(object) {
    let responseHTML = `<b>Detalles de la respuesta:</b><br>`;
    // Definir los campos que queremos mostrar en el correo
    const camposRequeridos = {
      pregunta1: 'Tipo de reporte',
      emergencia: 'Evento',
      pregunta4: 'Afectados'
    };
  
    for (const key in object) {
      // Solo incluir las claves que están en camposRequeridos
      if (camposRequeridos[key]) {
        const etiquetaAmigable = camposRequeridos[key]; // Usar la etiqueta amigable definida
        let valor = object[key];
        
        // Verificar si la clave actual es la de 'pregunta4' y si es un array
        if (key === 'pregunta4' && Array.isArray(valor)) {
          valor = valor.map(num => labels[key][num] || num).join(', ');
        } else {
          valor = labels[key] && labels[key][valor] ? labels[key][valor] : valor; // Traducir el valor si es necesario
        }
        
        responseHTML += `<strong>${etiquetaAmigable}</strong>: ${valor}<br>`;
      }
    }
    return responseHTML;
}

/**Fecha*/

function obtenerFechaActual() {
    // Obtener la fecha actual
    const today = new Date();

    // Obtener los componentes de la fecha
    const year = today.getFullYear(); // Año (ejemplo: 2024)
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Mes (ejemplo: 04)
    const day = String(today.getDate()).padStart(2, '0'); // Día (ejemplo: 16)
    const hours = String(today.getHours()).padStart(2, '0'); // Horas (ejemplo: 10)
    const minutes = String(today.getMinutes()).padStart(2, '0'); // Minutos (ejemplo: 40)
    const seconds = String(today.getSeconds()).padStart(2, '0'); // Segundos (ejemplo: 01)
    const milliseconds = String(today.getMilliseconds()).padStart(3, '0'); // Milisegundos (ejemplo: 737)

    // Obtener el desplazamiento horario (ejemplo: -05:00)
    const timezoneOffset = today.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const timezone = (timezoneOffset < 0 ? '+' : '-') + 
                     String(offsetHours).padStart(2, '0') + ':' + 
                     String(offsetMinutes).padStart(2, '0');

    // Crear la cadena de fecha con el formato deseado 
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezone}`;

    return formattedDate;
}

// Ejemplo de uso
const fechaActual = obtenerFechaActual();
console.log(fechaActual);
const uuidActual = uuidv4();
console.log(uuidActual);
function obtenerdatosaxios() {
    
}
// Función para obtener los datos axios
function obtenerDataAxios() {
    const fechaActual = obtenerFechaActual();
    const uuidActual = uuidv4();

    const dataaxios = {
        "id": "aFHErCgKjoXEtQvohGz6r4",
        "version": "1 (2024-04-10 03:14:06)",
        "submission": {
            "start": fechaActual,
            "end": fechaActual,
            "telefono": miObjetoGlobal.telefono,
            "pregunta1": miObjetoGlobal.pregunta1,
            "pregunta2": miObjetoGlobal.pregunta2,
            "pregunta2longitud": miObjetoGlobal.pregunta2longitud,
            "pregunta2latitud": miObjetoGlobal.pregunta2latitud,
            "pregunta3": "",
            "pregunta4": miObjetoGlobal.pregunta4,
            "__version__": "v3jWwL2376HwyerqRvHavw",
            "_submitted_by": null,
            "meta": {
                "instanceID": uuidActual
            }
        }
    };

    return dataaxios;
}

/** */




/*
function obtenerConfigAxios(dataaxios) {
    const configaxios = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://cat.mtr.pnud.org.co/api/v1/submissions',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token cd0f93ba3c272d9780daea135131713e4da35cbe'
        },
        data: dataaxios
    };

    return configaxios;
}*/
/**FIN KOBO */


/****Tracduccion de etiquetas */



/*******Inicio Emergencia Incendio => Flow 3************************************************************************************************************************************************************************* */

const flowPosibleConato4_Emergencia_ = addKeyword (['9','8'])
.addAnswer('Igualmente, te invitamos a tener en cuentas las siguientes recomendaciones:')
.addAnswer('*Si estás cerca del incendio forestal:*')
.addAnswer('•	Aléjate del fuego en dirección opuesta al humo y dirígete a un área amplia sin vegetación o material combustible (si es posible).','•	Cubre nariz y boca con un trapo húmedo o evite inhalar el humo.','•	No intentes cruzar las llamas o apagar el incendio si no haces parte de un organismo operativo del territorio.')
.addAnswer('*Si no estás cerca del incendio forestal*','•	Mantente informado a través de fuentes confiables y sigua las instrucciones de los Bomberos, Defensa Civil, Cruz Roja o Coordinador Municipal de Gestión del Riesgo de Desastres.')
.addAnswer(
    [
        'Igualmente, si deseas hacer el reporte por otros medios comunícate a las líneas nacionales de atención:',

        '🚒 Bomberos: 119',
        '🔴 Cruz Roja: 132',
        '🚨 Defensa Civil: 144',
        '👮 Policía Nacional: 123',

        '*Recuerda que la seguridad y el bienestar de las personas son nuestra prioridad. 🙌*'
        
    ]
)
.addAnswer('Si deseas hacer un nuevo reporte de alerta o emergencia por favor escribe *1*')

/**PRUEBA CONEXION */


/** */
const flowConato2 = addKeyword(['1', '2', '3', '4', '5', '6', '7'])
.addAnswer(
    [
        'Hemos recibido tu reporte. Si deseas incluir tu número de teléfono en la información enviada, por favor escribe *9*. Si prefieres enviar el reporte sin incluir tu número de teléfono, escribe *8*.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.trim() === '9') {
            miObjetoGlobal.telefono = ctx.from;
            console.log("El usuario eligió incluir su teléfono:", miObjetoGlobal.telefono);
        } else if (ctx.body.trim() === '8') {
            console.log("El usuario eligió no incluir su teléfono.");
            miObjetoGlobal.telefono = null;
        } else {
            return fallBack('Por favor, ingresa *9* para incluir tu número de teléfono o *8* para no incluirlo y enviar solo el reporte.');
        }

        // Enviar datos a la nueva API
        await enviarDatosANuevaAPI();
    },
    [flowPosibleConato4_Emergencia_]
);


/** */
/** */


/** */
const flowConato1 = addKeyword('1')
.addAnswer('*Ahora, indicame si ¿Cerca del incendio se encuentran? (Por favor, selecciona una o varias opciones según tus necesidades (ejemplo: 1, 2, etc.)):*')
.addAnswer(
    [
        'Escribe *1* para personas.',
        'Escribe *2* para animales.',
        'Escribe *3* para cultivos.',
        'Escribe *4* para viviendas.',
        'Escribe *5* para otro tipo de infraestructura.',
        'Escribe *6* para ninguno de los anteriores.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        const validOptions = ['1', '2', '3', '4', '5', '6'];
        const userInputs = ctx.body.split(',').map(input => input.trim());

        // Verificar que todas las opciones ingresadas sean válidas
        const allValid = userInputs.every(input => validOptions.includes(input));

        if (!allValid) {
            return fallBack('Por favor, ingresa una opción válida');
        }

        miObjetoGlobal.pregunta4 = userInputs.map(Number);

        //console.log(miObjetoGlobal);
    },
    [flowConato2]
);
/** */
/** */
const flowFotoConato = addKeyword('1')
.addAnswer(
    [
        'Si tienes la posibilidad, por favor, comparte una foto de la situación que se está reportando a través de WhatsApp.',
        'Si no puedes compartir una foto, simplemente escribe *1* para continuar.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body === '1') {
            miObjetoGlobal.pregunta3 = 'No se adjuntó foto';
            console.log(miObjetoGlobal);
        } else if (ctx.message && ctx.message.imageMessage) {
            miObjetoGlobal.pregunta3 = 'Foto adjuntada';
            miObjetoGlobal.foto = {
                url: ctx.message.imageMessage.url,
                mimetype: ctx.message.imageMessage.mimetype,
                fileLength: ctx.message.imageMessage.fileLength,
                height: ctx.message.imageMessage.height,
                width: ctx.message.imageMessage.width
            };
            console.log(miObjetoGlobal);
        } else {
            return fallBack('Por favor, comparte una foto o escribe *1* para continuar.');
        }
    },
    [flowConato1]
);

/** */
/** */
/** */


const flowConato = addKeyword('1')
.addAnswer('Compártenos tu ubicación a través de Whatsapp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '• Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar que el mensaje sea una ubicación válida
        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('Esta opción no es válida, por favor, comparte la ubicación del evento que estás reportando.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
        } catch (error) {
            return fallBack(error.message);
        }

        console.log(miObjetoGlobal);
    },
    [flowFotoConato]
);




/*******Fin Emergencia Incendio => Flow 3************************************************************************************************************************************************************************* */






/*******Inicio Emergencia Inundación => ************************************************************************************************************************************************************************* */








const flowPosibleConato4_Emergencia = addKeyword (['9','8'])
.addAnswer('Igualmente, te invitamos a tener en cuentas las siguientes recomendaciones:')
.addAnswer('*Si estás cerca de la inundación*')
.addAnswer('-No cruce los cuerpos de agua ni esté cerca de ellos (ni caminando ni con algún tipo de transporte).','-No haga caso a rumores, oriéntese por la información oficial.','- Desconecta la energía eléctrica de toda la vivienda, cierra el suministro de gas y agua (en caso de presentarse un desbordamiento del cuerpo de agua o rebosamiento de agua del alcantarillado).')
.addAnswer('-Desconecta la energía eléctrica de toda la vivienda (si ésta se encuentra cerca del cuerpo de agua)', 'cierra el suministro de gas y agua (en caso de presentarse un desbordamiento del cuerpo de agua o rebosamiento de agua del alcantarillado).')
.addAnswer('-Trate de colocar sus enseres en un lugar alto.','- No consuma alimentos que haga tenido contacto con el agua de la inundación.')
.addAnswer('*Si no estás cerca del río/quebrada/arroyo/caño/mar.*')
.addAnswer('- Trate de colocar sus enseres en un lugar alto.','- Esté preparado para evacuar.','-Resguarde a sus mascotas en un lugar seguro.')
.addAnswer('Mantente informado a través de fuentes confiables y sigua las instrucciones de los Bomberos, Defensa Civil, Cruz Roja o Coordinador Municipal de Gestión del Riesgo de Desastres.')

.addAnswer(
    [
        'Igualmente, si deseas hacer el reporte por otros medios comunícate a las líneas nacionales de atención:',

        '🚒 Bomberos: 119',
        '🔴 Cruz Roja: 132',
        '🚨 Defensa Civil: 144',
        '👮 Policía Nacional: 123',

        '*Recuerda que la seguridad y el bienestar de las personas son nuestra prioridad. 🙌*'
        
    ]
)
.addAnswer('Si deseas hacer un nuevo reporte de alerta o emergencia por favor escribe *1*')


/** */
const flowNivel_agua_incrementado2 = addKeyword(['1', '2', '3', '4', '5', '6', '7'])
.addAnswer(
    [
        'Hemos recibido tu reporte. Si deseas incluir tu número de teléfono en la información enviada, por favor escribe *9*. Si prefieres enviar el reporte sin incluir tu número de teléfono, escribe *8*.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.trim() === '9') {
            miObjetoGlobal.telefono = ctx.from;
            console.log("El usuario eligió incluir su teléfono:", miObjetoGlobal.telefono);
        } else if (ctx.body.trim() === '8') {
            console.log("El usuario eligió no incluir su teléfono.");
            miObjetoGlobal.telefono = null;
        } else {
            return fallBack('Por favor, ingresa *9* para incluir tu número de teléfono o *8* para no incluirlo y enviar solo el reporte.');
        }

        // Enviar datos a la nueva API
        await enviarDatosANuevaAPI();
    },
    [flowPosibleConato4_Emergencia] 
);

//** */


/** */
const flowNivel_agua_incrementado1 = addKeyword(['1','2'])
.addAnswer('*Nos puedes indicar si cerca de la Inundación se encuentran (Por favor, selecciona una o varias opciones según tus necesidades (ejemplo: 1, 2, etc.)):*')
.addAnswer(
    [
        'Escribe *1* para personas.',
        'Escribe *2* para animales.',
        'Escribe *3* para cultivos.',
        'Escribe *4* para viviendas.',
        'Escribe *5* para otro tipo de infraestructura.',
        'Escribe *6* para ninguno de los anteriores.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        const validOptions = ['1', '2', '3', '4', '5', '6'];
        const userInputs = ctx.body.split(',').map(input => input.trim());

        // Verificar que todas las opciones ingresadas sean válidas
        const allValid = userInputs.every(input => validOptions.includes(input));

        if (!allValid) {
            return fallBack('Por favor, ingresa una opción válida');
        }

        miObjetoGlobal.pregunta4 = userInputs.map(Number);

        //console.log(miObjetoGlobal);
    },
    [flowNivel_agua_incrementado2]
);
/** */

/** */
const flowFotoNivel_agua_incrementado = addKeyword('2')
.addAnswer(
    [
        'Si tienes la posibilidad, por favor, *comparte una foto* de la situación que se está reportando a través de WhatsApp.',
        'Si no puedes compartir una foto, simplemente escribe *1* para continuar.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar si el usuario ha enviado una foto o ha escrito "1"
        if (ctx.body === '1') {
            miObjetoGlobal.pregunta3 = 'No se adjuntó foto';
            console.log(miObjetoGlobal);
        } else if (ctx.message && ctx.message.imageMessage) {
            miObjetoGlobal.pregunta3 = 'Foto adjuntada';
            miObjetoGlobal.foto = {
                url: ctx.message.imageMessage.url,
                mimetype: ctx.message.imageMessage.mimetype,
                fileLength: ctx.message.imageMessage.fileLength,
                height: ctx.message.imageMessage.height,
                width: ctx.message.imageMessage.width
            };
            console.log(miObjetoGlobal);
        } else {
            return fallBack('Por favor, comparte una foto o escribe *1* para continuar.');
        }
    },
    [flowNivel_agua_incrementado1]
);
/** */


/** */


/** */

const flowNivel_agua_incrementado = addKeyword('2')
.addAnswer('Compártenos tu ubicación a través de Whatsapp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '• Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar que el mensaje sea una ubicación válida
        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('Esta opción no es válida, por favor, comparte la ubicación del evento que estás reportando.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
        } catch (error) {
            return fallBack(error.message);
        }

        console.log(miObjetoGlobal);
    },
    [flowFotoNivel_agua_incrementado]
);





/*
const flowNivel_agua_incrementado = addKeyword('2')
.addAnswer('Compártenos tu ubicación a través de Whatsapp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '• Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.',
        'Si no puedes compartir la ubicación automáticamente, escribe *manual* para ingresar la ubicación manualmente.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.toLowerCase() === 'manual') {
            return fallBack('Por favor, ingresa el nombre del departamento.');
        }

        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('No se recibió la ubicación. Por favor intenta de nuevo o escribe *manual* para ingresar la ubicación manualmente.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
            console.log(miObjetoGlobal);
        } catch (error) {
            console.error('Error al geocodificar la ubicación:', error.message);
            return fallBack('No se pudo obtener el nombre del departamento y municipio, por favor ingresa la ubicación manualmente.');
        }
    },
    [flowFotoNivel_agua_incrementado]
)
.addAnswer({ capture: true },
    async (ctx, { nextStep }) => {
        miObjetoGlobal.departamento = ctx.body.trim();
        nextStep('Ahora, ingresa el nombre del municipio.');
    }
)
.addAnswer({ capture: true },
    async (ctx, { nextStep }) => {
        miObjetoGlobal.municipio = ctx.body.trim();
        nextStep('Por favor, ingresa el nombre del barrio o vereda.');
    }
)
.addAnswer({ capture: true },
    async (ctx, { flowComplete }) => {
        miObjetoGlobal.barrio_vereda = ctx.body.trim();
        console.log(`Ubicación manual ingresada: Departamento: ${miObjetoGlobal.departamento}, Municipio: ${miObjetoGlobal.municipio}, Barrio/Vereda: ${miObjetoGlobal.barrio_vereda}`);
        flowComplete('Gracias por proporcionar la información. Procesando la ubicación...');
    }
);*/


/** */


/*******Fin Emergencia Inundación => Flow 3************************************************************************************************************************************************************************* */





/** Inicio Alerta agua incrementado => flowdos ************************************************************************************************************************************************************/

//

const flowPosibleConato4 = addKeyword (['9','8'])

.addAnswer('Igualmente, te invitamos a tener en cuentas las siguientes recomendaciones:')
.addAnswer('*Si estás cerca del río/quebrada/arroyo/caño/mar*')
.addAnswer('-No intentes cruzar o estar cerca de las márgenes del cuerpo de agua.','-Aléjese del cuerpo de agua que presenta niveles altos y ubíquese en un lugar seguro (o alto).')
.addAnswer('-Desconecta la energía eléctrica de toda la vivienda (si ésta se encuentra cerca del cuerpo de agua)', 'cierra el suministro de gas y agua (en caso de presentarse un desbordamiento del cuerpo de agua o rebosamiento de agua del alcantarillado).','-Trate de colocar sus enseres en un lugar alto.')
.addAnswer('*Si no estás cerca del río/quebrada/arroyo/caño/mar.*')
.addAnswer('Mantente informado a través de fuentes confiables y sigua las instrucciones de los Bomberos, Defensa Civil, Cruz Roja o Coordinador Municipal de Gestión del Riesgo de Desastres.')
.addAnswer(
    [
        'Igualmente, si deseas hacer el reporte por otros medios comunícate a las líneas nacionales de atención:',

        '🚒 Bomberos: 119',
        '🔴 Cruz Roja: 132',
        '🚨 Defensa Civil: 144',
        '👮 Policía Nacional: 123',

        '*Recuerda que la seguridad y el bienestar de las personas son nuestra prioridad. 🙌*'
        
    ]
)
.addAnswer('Si deseas hacer un nuevo reporte de alerta o emergencia por favor escribe *1*')
/** */

/** */
const flowPosibleNivel_agua_incrementado2 = addKeyword(['1', '2', '3', '4', '5', '6', '7'])
.addAnswer(
    [
        'Hemos recibido tu reporte. Si deseas incluir tu número de teléfono en la información enviada, por favor escribe *9*. Si prefieres enviar el reporte sin incluir tu número de teléfono, escribe *8*.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.trim() === '9') {
            miObjetoGlobal.telefono = ctx.from;
            console.log("El usuario eligió incluir su teléfono:", miObjetoGlobal.telefono);
        } else if (ctx.body.trim() === '8') {
            console.log("El usuario eligió no incluir su teléfono.");
            miObjetoGlobal.telefono = null;
        } else {
            return fallBack('Por favor, ingresa *9* para incluir tu número de teléfono o *8* para no incluirlo y enviar solo el reporte.');
        }

        // Enviar datos a la nueva API
        await enviarDatosANuevaAPI();
    },
    [flowPosibleConato4] 
);

/** */

   
/** */ 
const flowPosibleNivel_agua_incrementado1 = addKeyword(['1','2'])
.addAnswer('*Nos puedes indicar si cerca del río/quebrada/arroyo/caño/mar se encuentran, (Por favor, selecciona una o varias opciones según tus necesidades(ejemplo: 1, 2, etc.)):*')
.addAnswer(
    [
        'Escribe *1* para personas.',
        'Escribe *2* para animales.',
        'Escribe *3* para cultivos.',
        'Escribe *4* para viviendas.',
        'Escribe *5* para otro tipo de infraestructura.',
        'Escribe *6* para ninguno de los anteriores.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        const validOptions = ['1', '2', '3', '4', '5', '6'];
        const userInputs = ctx.body.split(',').map(input => input.trim());

        // Verificar que todas las opciones ingresadas sean válidas
        const allValid = userInputs.every(input => validOptions.includes(input));

        if (!allValid) {
            return fallBack('Por favor, ingresa una opción válida');
        }

        miObjetoGlobal.pregunta4 = userInputs.map(Number);

        //console.log(miObjetoGlobal);
    },
    [flowPosibleNivel_agua_incrementado2]
);
/** */


/** */
const flowFotoNivelDelAgua = addKeyword('2')
.addAnswer(
    [
        'Si tienes la posibilidad, por favor, comparte una foto de la situación que se está reportando a través de WhatsApp.',
        'Si no puedes compartir una foto, simplemente escribe *1* para continuar.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar si el usuario ha enviado una foto o ha escrito "1"
        if (ctx.body === '1') {
            miObjetoGlobal.pregunta3 = 'No se adjuntó foto';
            console.log(miObjetoGlobal);
        } else if (ctx.message && ctx.message.imageMessage) {
            miObjetoGlobal.pregunta3 = 'Foto adjuntada';
            miObjetoGlobal.foto = {
                url: ctx.message.imageMessage.url,
                mimetype: ctx.message.imageMessage.mimetype,
                fileLength: ctx.message.imageMessage.fileLength,
                height: ctx.message.imageMessage.height,
                width: ctx.message.imageMessage.width
            };
            console.log(miObjetoGlobal);
        } else {
            return fallBack('Por favor, comparte una foto o escribe *1* para continuar.');
        }
    },
    [flowPosibleNivel_agua_incrementado1]
);
/** */


/** */ 

const flowPosibleNivel_agua_incrementado = addKeyword('2')
.addAnswer('Compártenos tu ubicación a través de Whatsapp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '• Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar que el mensaje sea una ubicación válida
        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('Esta opción no es válida, por favor, comparte la ubicación del evento que estás reportando.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
        } catch (error) {
            return fallBack(error.message);
        }

        console.log(miObjetoGlobal);
    },
    [flowFotoNivelDelAgua]
);


/*
const flowPosibleNivel_agua_incrementado = addKeyword(['2'])
.addAnswer('Compártenos tu ubicación a través de Whatsapp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '• Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.',
        'Si no puedes compartir la ubicación automáticamente, escribe *manual* para ingresar la ubicación manualmente.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.toLowerCase() === 'manual') {
            return fallBack('Por favor, ingresa el nombre del departamento.');
        }

        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('No se recibió la ubicación. Por favor intenta de nuevo o escribe *manual* para ingresar la ubicación manualmente.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
            console.log(miObjetoGlobal);
        } catch (error) {
            console.error('Error al geocodificar la ubicación:', error.message);
            return fallBack('No se pudo obtener el nombre del departamento y municipio, por favor ingresa la ubicación manualmente.');
        }
    },
    [flowFotoNivelDelAgua]
)
.addAnswer({ capture: true },
    async (ctx, { nextStep }) => {
        miObjetoGlobal.departamento = ctx.body.trim();
        nextStep('Ahora, ingresa el nombre del municipio.');
    }
)
.addAnswer({ capture: true },
    async (ctx, { nextStep }) => {
        miObjetoGlobal.municipio = ctx.body.trim();
        nextStep('Por favor, ingresa el nombre del barrio o vereda.');
    }
)
.addAnswer({ capture: true },
    async (ctx, { flowComplete }) => {
        miObjetoGlobal.barrio_vereda = ctx.body.trim();
        console.log(`Ubicación manual ingresada: Departamento: ${miObjetoGlobal.departamento}, Municipio: ${miObjetoGlobal.municipio}, Barrio/Vereda: ${miObjetoGlobal.barrio_vereda}`);
        flowComplete('Gracias por proporcionar la información. Procesando la ubicación...');
    }
);*/



/** */



/** Fin Alerta agua incrementado => flowdos *******************************************************************************************************************************************/


/** Inicio Alerta conato => flowdos *************************************************************************************************************************************************************/


const flowPosibleConato4_ = addKeyword (['9','8'])
.addAnswer('Igualmente, te invitamos a tener en cuentas las siguientes recomendaciones:')
.addAnswer('*Si estás cerca de la Columna de humo o inicio de un incendio forestal.*')
.addAnswer('•Aléjate del fuego en dirección (contraria)opuesta al humo y dirígete a un área amplia sin vegetación o material combustible.',
'•	Cubre nariz y boca con un trapo húmedo o evite inhalar el humo.',
'•	No intentes cruzar las llamas o apagar el incendio si no haces parte de un organismo operativo del territorio.')
.addAnswer('*Si no estás cerca de la Columna de humo o inicio de un incendio forestal*')
.addAnswer('•	Mantente informado a través de fuentes confiables y sigua las instrucciones de los Bomberos, Defensa Civil, Cruz Roja o Coordinador Municipal de Gestión del Riesgo de Desastres.',
'Espero que te encuentres a salvo. Si necesitas más asistencia, no dudes en preguntar.')


.addAnswer(
    [
        
        'Igualmente, si deseas hacer el reporte por otros medios comunícate a las líneas nacionales de atención:',

        '🚒 Bomberos: 119',
        '🔴 Cruz Roja: 132',
        '🚨 Defensa Civil: 144',
        '👮 Policía Nacional: 123',

        '*Recuerda que la seguridad y el bienestar de las personas son nuestra prioridad. 🙌*'
        
    ]
)
.addAnswer('Si deseas hacer un nuevo reporte de alerta o emergencia por favor escribe *1*')

/** */

/** */
const flowPosibleConato3 = addKeyword(['1', '2', '3', '4', '5', '6'])
.addAnswer(
    [
        'Hemos recibido tu reporte. Si deseas incluir tu número de teléfono en la información enviada, por favor escribe *9*. Si prefieres enviar el reporte sin incluir tu número de teléfono, escribe *8*.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        if (ctx.body.trim() === '9') {
            miObjetoGlobal.telefono = ctx.from;
            console.log("El usuario eligió incluir su teléfono:", miObjetoGlobal.telefono);
        } else if (ctx.body.trim() === '8') {
            console.log("El usuario eligió no incluir su teléfono.");
            miObjetoGlobal.telefono = null;
        } else {
            return fallBack('Por favor, ingresa *9* para incluir tu número de teléfono o *8* para no incluirlo y enviar solo el reporte.');
        }

        // Enviar datos a la nueva API
        await enviarDatosANuevaAPI();
    },
    [flowPosibleConato4_] 
);

/** */

/** */
const flowPosibleConato2 = addKeyword('1')
.addAnswer('Nos puedes indicar si cerca de la columna de humo o inicio de un incendio forestal se encuentran (Por favor, selecciona una o varias opciones según tus necesidades (ejemplo: 1, 2, etc.)):')
.addAnswer(
    [
        'Escribe *1* para personas.',
        'Escribe *2* para animales.',
        'Escribe *3* para cultivos.',
        'Escribe *4* para viviendas.',
        'Escribe *5* para otro tipo de infraestructura.',
        'Escribe *6* para ninguno de los anteriores.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        const validOptions = ['1', '2', '3', '4', '5', '6'];
        const userInputs = ctx.body.split(',').map(input => input.trim());

        // Verificar que todas las opciones ingresadas sean válidas
        const allValid = userInputs.every(input => validOptions.includes(input));

        if (!allValid) {
            return fallBack('Por favor, ingresa una opción válida');
        }

        miObjetoGlobal.pregunta4 = userInputs.map(Number);

        //console.log(miObjetoGlobal);
    },
    [flowPosibleConato3]
);

/** */

/**Inicio Adjuntar imagen */ 
 


/** */
const flowFoto = addKeyword('1')
.addAnswer(
    [
        'Si tienes la posibilidad, por favor, comparte una foto de la situación que se está reportando a través de WhatsApp.',
        'Si no puedes compartir una foto, simplemente escribe *1* para continuar.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar si el usuario ha enviado una foto o ha escrito "1"
        if (ctx.body === '1') {
            miObjetoGlobal.pregunta3 = 'No se adjuntó foto';
            console.log(miObjetoGlobal);
        } else if (ctx.message && ctx.message.imageMessage) {
            miObjetoGlobal.pregunta3 = 'Foto adjuntada';
            miObjetoGlobal.foto = {
                url: ctx.message.imageMessage.url,
                mimetype: ctx.message.imageMessage.mimetype,
                fileLength: ctx.message.imageMessage.fileLength,
                height: ctx.message.imageMessage.height,
                width: ctx.message.imageMessage.width
            };
            console.log(miObjetoGlobal);
        } else {
            return fallBack('Por favor, comparte una foto o escribe *1* para continuar.');
        }
    },
    [flowPosibleConato2]
);

/** */


/** */

const flowPosibleConato = addKeyword(['1'])
.addAnswer('Compártenos tu ubicación a través de WhatsApp. Así podremos tener un punto de referencia cercano al lugar de la alerta/emergencia.')
.addAnswer(
    [
        '*•* Recuerda que para compartir la ubicación debes dar clic en el más (+) o en el clip (📎) que aparece en la parte inferior del chat, luego oprimir el ícono de ubicación y dar clic en la opción “enviar tu ubicación actual”.'
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
        // Verificar que el mensaje sea una ubicación válida
        if (!ctx.message || !ctx.message.locationMessage) {
            return fallBack('Esta opción no es válida, por favor, comparte la ubicación del evento que estás reportando.');
        }

        // Extraer y guardar la latitud y longitud
        const lat = ctx.message.locationMessage.degreesLatitude;
        const lon = ctx.message.locationMessage.degreesLongitude;
        miObjetoGlobal.pregunta2latitud = lat;
        miObjetoGlobal.pregunta2longitud = lon;
        miObjetoGlobal.pregunta2 = `${lat} ${lon}`;

        // Llamar a la función de geocodificación
        try {
            await geocodeLocation(lat, lon);
        } catch (error) {
            return fallBack(error.message);
        }

        console.log(miObjetoGlobal);
    },
    [flowFoto]
);



 
/** Fin Alerta conato => flowdos ***************************************************************************************************************************************************************/


/**INICIO EVENTOS */
/*
const ChatGPTClass = require('./ChatGPTClass');
const ChatGPTInstance = new ChatGPTClass()
*/
/*
const flowTres = addKeyword('3') 
.addAnswer('¿Qué dudas tienes respecto a las alertas y emergencia?', { capture: true },
async (ctx, { flowDynamic }) => {
  const body = ctx.body
  const respuesta = await ChatGPTInstance.handleMsgChatGPT(body)
  const message = respuesta.text
  await flowDynamic(message)
}
)*/



const flowDos = addKeyword('2')
.addAnswer ('Se reportará una *emergencia*.')
.addAnswer (
    [
        'Escribe *1* para Incendio forestal.',
        'Escribe *2* Inundación ocasionada por el desbordamiento de un río/quebrada/arroyo/caño o por aumento en el nivel del mar.'
    ],
    {
        capture:true
    },async (ctx, {fallBack}) => {
        if (!['1','2'].includes (ctx.body)) {
            return fallBack('Por favor, ingresa una opción válida');
        }
    
    miObjetoGlobal.alerta= ctx.body
    
    
    },
    [flowConato, flowNivel_agua_incrementado]) 

//FIN FLUJOS HIJOS PRINCIPAL

const  flowUno = addKeyword('1')
.addAnswer ('Se reportará una *alerta*')
.addAnswer (
    [
        'Escriba *1* para Columna de humo o inicio de un incendio forestal.',
        'Escriba *2* para Aumento en el nivel del río/quebrada/arroyo/caño/mar.' 
    ],
    {
        capture:true
    },async (ctx, {fallBack}) => {
        if (!['1','2'].includes (ctx.body)) {
            return fallBack('Por favor, ingresa una opción válida');
        } 
    miObjetoGlobal.emergencia= ctx.body
    
    //console.log(miObjetoGlobal)
    },
    [flowPosibleConato,flowPosibleNivel_agua_incrementado]
    
) 

//**Fin flow Reporte emergencia  */





/*******Inicio Emergencia Incendio => Flow 3************************************************************************************************************************************************************************* */



/** */



const flowPrincipal = addKeyword(['EVENTS.WELCOME','9'])
    .addAnswer('¡Hola! Soy ALERCOM, tu chatbot comunitario. Aquí puedes reportar alertas o emergencias que se presenten en territorio para notificar rápidamente a las autoridades locales.')
    .addAnswer('Antes de comenzar, por favor revisa nuestra *Politica de datos*: http://surl.li/upkly')
    .addAnswer(
        [
            '*¿Qué reporte deseas realizar el día de hoy?* 🌍🚨',
            'Escriba *1* para reportar una *alerta* o aviso sobre sobre una emergencia que está por suceder.',
            'Escriba *2* para informar sobre una *emergencia* que está ocurriendo en este momento.',
        ],
        { capture: true },
        async (ctx, { fallBack }) => {
            if (!['1', '2'].includes(ctx.body)) {
                return fallBack('Por favor, ingresa una opción válida, *1 para alertas*, *2 para emergencias*');
            }
            miObjetoGlobal.pregunta1 = ctx.body;
            console.log(miObjetoGlobal);
        },
        [flowUno, flowDos]
    );





const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
