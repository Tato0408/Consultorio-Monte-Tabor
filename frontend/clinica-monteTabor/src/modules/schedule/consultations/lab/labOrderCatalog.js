// Catálogo de exámenes de la orden de laboratorio, transcrito de la hoja de
// solicitud del laboratorio de referencia. Cada panel es un grupo de casillas.
//
// La orden guarda las CLAVES ("panelKey:testKey"), no las etiquetas, para que
// corregir la redacción de un examen no invalide las órdenes ya guardadas.
// La redacción exacta de cada examen se revisa/ajusta según la hoja real.

export const LAB_ORDER_CATALOG = [
    {
        key: "hematologia",
        title: "Panel de hematología",
        tests: [
            { key: "hemograma_completo", label: "Hemograma completo" },
            { key: "hemoglobina", label: "Hemoglobina" },
            { key: "hematocrito", label: "Hematocrito" },
            { key: "frotis_sangre_periferica", label: "Frotis en sangre periférica" },
            { key: "reticulocitos", label: "Reticulocitos" },
            { key: "vsg", label: "VSG (eritrosedimentación)" },
            { key: "grupo_sanguineo", label: "Grupo sanguíneo y Rh" },
            { key: "coombs_directo", label: "Test de Coombs directo" },
            { key: "coombs_indirecto", label: "Test de Coombs indirecto" },
            { key: "plasmodium_gota_gruesa", label: "Plasmodium / gota gruesa" },
        ],
    },
    {
        key: "bioquimica",
        title: "Bioquímica",
        tests: [
            { key: "glucosa", label: "Glucosa" },
            { key: "glucosa_post_prandial", label: "Glucosa post-prandial" },
            { key: "test_tolerancia", label: "Test de tolerancia a la glucosa" },
            { key: "hemoglobina_glicosilada", label: "Hemoglobina glicosilada" },
            { key: "urea", label: "Urea" },
            { key: "creatinina", label: "Creatinina" },
            { key: "acido_urico", label: "Ácido úrico" },
            { key: "proteinas_totales", label: "Proteínas totales" },
            { key: "bilirrubinas", label: "Bilirrubinas" },
            { key: "prueba_embarazo", label: "Prueba de embarazo en sangre" },
        ],
    },
    {
        key: "electrolitos",
        title: "Electrolitos",
        tests: [
            { key: "sodio", label: "Sodio" },
            { key: "potasio", label: "Potasio" },
            { key: "cloro", label: "Cloro" },
            { key: "calcio", label: "Calcio" },
            { key: "calcio_ionico", label: "Calcio iónico" },
            { key: "fosforo", label: "Fósforo" },
            { key: "magnesio", label: "Magnesio" },
            { key: "litio", label: "Litio" },
            { key: "amonio", label: "Amonio" },
            { key: "lactato", label: "Lactato" },
        ],
    },
    {
        key: "panel_tiroideo",
        title: "Panel tiroideo",
        tests: [
            { key: "t3_total", label: "T3 total" },
            { key: "t3_libre", label: "T3 libre" },
            { key: "t4_total", label: "T4 total" },
            { key: "t4_libre", label: "T4 libre" },
            { key: "tsh", label: "TSH" },
            { key: "tiroglobulinas", label: "Tiroglobulinas" },
            { key: "ac_tpo", label: "Ac. T.P.O." },
            { key: "ac_antitiroglobulinas", label: "Ac. antitiroglobulinas" },
        ],
    },
    {
        key: "uroanalisis",
        title: "Uroanálisis",
        tests: [
            { key: "elemental_microscopico", label: "Elemental y microscópico" },
            { key: "urocultivo_antibiograma", label: "Cultivo y antibiograma" },
            { key: "grasa_gota_fresca", label: "Grasa en gota fresca" },
            { key: "proteinas_24h", label: "Proteínas en orina de 24 horas" },
            { key: "proteina_orina_casual", label: "Proteína en orina casual" },
            { key: "sodio_orina", label: "Sodio en orina" },
            { key: "potasio_orina", label: "Potasio en orina" },
            { key: "cloro_orina", label: "Cloro en orina" },
            { key: "acido_urico_orina", label: "Ácido úrico en orina" },
            { key: "urea_orina", label: "Urea en orina" },
            { key: "microalbuminuria", label: "Microalbuminuria" },
            { key: "clearance_creatinina", label: "Clearance de creatinina" },
            { key: "prueba_embarazo_orina", label: "Prueba de embarazo en orina" },
        ],
    },
    {
        key: "panel_anemias",
        title: "Panel de anemias",
        tests: [
            { key: "hierro_serico", label: "Hierro sérico" },
            { key: "transferrina", label: "Transferrina" },
            { key: "ferritina", label: "Ferritina" },
            { key: "acido_folico", label: "Ácido fólico" },
            { key: "vitamina_b12", label: "Vitamina B12" },
            { key: "g6pd", label: "Glucosa 6 fosfato deshidrogenasa" },
            { key: "eritropoyetina", label: "Eritropoyetina" },
            { key: "electroforesis_hemoglobina", label: "Electroforesis de hemoglobina" },
            { key: "electroforesis_proteina", label: "Electroforesis de proteína" },
            { key: "haptoglobina", label: "Haptoglobina" },
        ],
    },
    {
        key: "panel_diabetes",
        title: "Panel de diabetes",
        tests: [
            { key: "insulina", label: "Insulina" },
            { key: "homa_ir", label: "Homa - IR" },
            { key: "hemoglobina_glicosilada", label: "Hemoglobina glicosilada" },
            { key: "fructosamina", label: "Fructosamina" },
            { key: "peptido_c", label: "Péptido C" },
        ],
    },
    {
        key: "lipidos",
        title: "Lípidos",
        tests: [
            { key: "lipidos_totales", label: "Lípidos totales" },
            { key: "colesterol", label: "Colesterol total" },
            { key: "colesterol_hdl", label: "Colesterol HDL" },
            { key: "colesterol_ldl", label: "Colesterol LDL" },
            { key: "colesterol_vldl", label: "Colesterol VLDL" },
            { key: "trigliceridos", label: "Triglicéridos" },
            { key: "esteres_colesterol", label: "Ésteres del colesterol" },
            { key: "fosfolipidos", label: "Fosfolípidos" },
            { key: "apo_a", label: "Apo A" },
            { key: "apo_b", label: "Apo B" },
        ],
    },
    {
        key: "inmunologicos",
        title: "Inmunológicos",
        tests: [
            { key: "toxoplasma", label: "Toxoplasma IgM / IgG" },
            { key: "rubeola", label: "Rubéola IgM / IgG" },
            { key: "citomegalovirus", label: "Citomegalovirus IgM / IgG" },
            { key: "herpes_1", label: "Herpes I IgM / IgG" },
            { key: "herpes_2", label: "Herpes II IgM / IgG" },
            { key: "helicobacter_pylori_igm", label: "Helicobacter pylori IgM" },
            { key: "helicobacter_pylori_igg", label: "Helicobacter pylori IgG" },
            { key: "chlamydia_igm", label: "Chlamydia IgM" },
            { key: "chlamydia_igg", label: "Chlamydia IgG" },
            { key: "chagas", label: "Chagas" },
            { key: "cisticercosis_igm", label: "Cisticercosis IgM" },
            { key: "cisticercosis_igg", label: "Cisticercosis IgG" },
            { key: "tb_sangre", label: "Tb en sangre" },
            { key: "anca_c", label: "ANCA C" },
            { key: "anca_p", label: "ANCA P" },
            { key: "ac_antifosfolipido", label: "Ac. antifosfolipídico" },
            { key: "anticoagulante_lupico", label: "Anticoagulante lúpico" },
            { key: "antipeptido_citrulinado", label: "Antipéptido citrulinado" },
            { key: "ana", label: "Ac. antinucleares (ANA)" },
            { key: "anti_dna", label: "Anti DNA" },
            { key: "ig_g", label: "IgG" },
            { key: "ig_e", label: "IgE" },
            { key: "ig_m", label: "IgM" },
            { key: "ig_a", label: "IgA" },
            { key: "hepatitis_a_igm", label: "Hepatitis A IgM (HAV)" },
            { key: "hepatitis_a_igg", label: "Hepatitis A IgG" },
            { key: "hepatitis_b_hbsag", label: "Hepatitis B (HBsAg)" },
            { key: "hepatitis_b_core_igg", label: "Hepatitis B CORE IgG" },
            { key: "hepatitis_b_core_igm", label: "Hepatitis B CORE IgM" },
            { key: "hepatitis_c", label: "Hepatitis C (HVC)" },
            { key: "anti_ro_la", label: "Anti RO - LA" },
            { key: "anti_sm", label: "Anti - SM" },
            { key: "dengue", label: "Dengue" },
        ],
    },
    {
        key: "hormonas",
        title: "Hormonas",
        tests: [
            { key: "prolactina", label: "Prolactina" },
            { key: "lh", label: "LH" },
            { key: "fsh", label: "FSH" },
            { key: "estradiol", label: "Estradiol" },
            { key: "progesterona", label: "Progesterona" },
            { key: "testosterona", label: "Testosterona" },
            { key: "testosterona_libre", label: "Testosterona libre" },
            { key: "androstenediona", label: "Androstenediona" },
            { key: "dheas", label: "DHEAS" },
            { key: "acth", label: "ACTH" },
            { key: "insulina_horm", label: "Insulina" },
            { key: "cortisol_am", label: "Cortisol AM" },
            { key: "cortisol_pm", label: "Cortisol PM" },
            { key: "c3", label: "C3" },
            { key: "c4", label: "C4" },
            { key: "pth", label: "PTH (paratohormona)" },
            { key: "hgh", label: "HGH (hormona de crecimiento)" },
            { key: "hcg_cuantitativo", label: "HCG cuantitativo" },
            { key: "osteocalcina", label: "Osteocalcina" },
        ],
    },
    {
        key: "marcadores_tumorales",
        title: "Marcadores tumorales",
        tests: [
            { key: "afp", label: "AFP (alfafetoproteína)" },
            { key: "cea", label: "CEA (carcinoembrionario)" },
            { key: "ca_125", label: "CA 125 (ovario)" },
            { key: "ca_15_3", label: "CA 15-3 (mamas)" },
            { key: "ca_19_9", label: "CA 19-9 (páncreas)" },
            { key: "ca_72_4", label: "CA 72-4 (gástrico)" },
            { key: "cyfra_21_1", label: "Cyfra 21-1 (pulmón)" },
            { key: "psa_total", label: "PSA total" },
            { key: "psa_libre", label: "PSA libre %" },
            { key: "nse", label: "N.S.E. (enolasa neuroespecífica)" },
            { key: "beta2_microglobulina", label: "Beta 2 microglobulina" },
        ],
    },
    {
        key: "hemostasia",
        title: "Hemostasia",
        tests: [
            { key: "tiempo_sangria", label: "Tiempo de sangría" },
            { key: "tiempo_coagulacion", label: "Tiempo de coagulación" },
            { key: "tp", label: "T.P." },
            { key: "tpt", label: "T.P.T." },
            { key: "fibrinogeno", label: "Fibrinógeno" },
            { key: "inr", label: "INR" },
            { key: "plaquetas", label: "Plaquetas" },
            { key: "factor_v", label: "Factor V" },
            { key: "factor_viii", label: "Factor VIII" },
            { key: "factor_ix", label: "Factor IX" },
            { key: "factor_x", label: "Factor X" },
            { key: "factor_xi", label: "Factor XI" },
            { key: "dimero_d", label: "Dímero D" },
            { key: "fragilidad_osmotica", label: "Fragilidad osmótica" },
        ],
    },
    {
        key: "serologia_turbidimetria",
        title: "Serología / Turbidimetría",
        tests: [
            { key: "vdrl", label: "V.D.R.L." },
            { key: "hiv", label: "HIV" },
            { key: "wf", label: "W.W.F." },
            { key: "aso", label: "ASTO" },
            { key: "pcr", label: "PCR" },
            { key: "fr", label: "F.R." },
        ],
    },
    {
        key: "enzimas",
        title: "Enzimas",
        tests: [
            { key: "amilasa", label: "Amilasa" },
            { key: "lipasa", label: "Lipasa" },
            { key: "tgo", label: "T.G.O" },
            { key: "tgp", label: "T.G.P" },
            { key: "ggt", label: "G.G.T" },
            { key: "fosfatasa_alcalina", label: "Fosfatasa alcalina" },
            { key: "fosfatasa_acida_total", label: "Fosfatasa ácida total" },
            { key: "fosfatasa_acida_prostatica", label: "Fosfatasa ácida prostática" },
            { key: "colinesterasa", label: "Colinesterasa" },
            { key: "cpk", label: "C.P.K." },
            { key: "ck_mb", label: "CK - MB" },
            { key: "ldh", label: "L.D.H" },
            { key: "troponina", label: "Troponina" },
        ],
    },
    {
        key: "niveles_sericos",
        title: "Niveles séricos",
        tests: [
            { key: "digoxina", label: "Digoxina" },
            { key: "carbamazepina", label: "Carbamazepina" },
            { key: "fenitoina_sodica", label: "Fenitoína sódica" },
            { key: "fenobarbital", label: "Fenobarbital" },
            { key: "acido_valproico", label: "Ácido valproico" },
            { key: "ciclosporina", label: "Ciclosporina" },
            { key: "benzodiacepinas", label: "Benzodiacepinas" },
        ],
    },
    {
        key: "panel_drogas",
        title: "Panel de drogas",
        tests: [
            { key: "cocaina", label: "Cocaína" },
            { key: "marihuana", label: "Marihuana" },
            { key: "metanfetaminas", label: "Metanfetaminas" },
            { key: "extasis", label: "Éxtasis" },
            { key: "heroina", label: "Heroína" },
            { key: "benzodiacepinas", label: "Benzodiacepinas" },
        ],
    },
    {
        key: "heces",
        title: "Heces",
        tests: [
            { key: "coproparasitario", label: "Coproparasitario" },
            { key: "seriado_dias", label: "Seriado (días)" },
            { key: "coprologico", label: "Coprológico" },
            { key: "sangre_oculta", label: "Sangre oculta" },
            { key: "rotavirus", label: "Rotavirus" },
            { key: "adenovirus", label: "Adenovirus" },
            { key: "coprocultivo", label: "Coprocultivo" },
            { key: "helicobacter_pylori_ag", label: "Helicobacter pylori Ag." },
        ],
    },
    {
        key: "alergias",
        title: "Alergias",
        tests: [
            { key: "panel_respiratorio", label: "Panel respiratorio" },
            { key: "panel_alimenticio", label: "Panel alimenticio" },
            { key: "panel_medicamentos", label: "Panel de medicamentos" },
        ],
    },
    {
        key: "otros",
        title: "Otros",
        tests: [
            { key: "liquidos", label: "Líquidos" },
            { key: "cultivo_secrecion_vaginal", label: "Cultivo de secreción vaginal" },
            { key: "cultivo_semen", label: "Cultivo de semen" },
            { key: "cultivo_exudado_faringeo", label: "Cultivo de exudado faríngeo" },
            { key: "cultivo_liquidos", label: "Cultivo de líquidos" },
            { key: "hemocultivos", label: "Hemocultivos" },
            { key: "espermatograma", label: "Espermatograma" },
        ],
    },
];

// Clave estable de un examen dentro de la orden: "panelKey:testKey".
export const testKey = (panelKey, testKeyValue) => `${panelKey}:${testKeyValue}`;

// Mapa clave -> { panelTitle, label } para reconstruir etiquetas al mostrar o
// imprimir una orden guardada.
export const LAB_TEST_LABELS = LAB_ORDER_CATALOG.reduce((acc, panel) => {
    panel.tests.forEach((test) => {
        acc[testKey(panel.key, test.key)] = { panelTitle: panel.title, label: test.label };
    });
    return acc;
}, {});

// Cuenta de exámenes marcados, para los resúmenes ("N exámenes solicitados").
export const countSelectedTests = (tests) => (Array.isArray(tests) ? tests.length : 0);

// Agrupa una lista de claves marcadas por panel, respetando el orden del
// catálogo. Devuelve [{ title, labels: [...] }] solo con los paneles que
// tienen al menos un examen marcado.
export const groupSelectedTests = (tests) => {
    const selected = new Set(Array.isArray(tests) ? tests : []);
    return LAB_ORDER_CATALOG.map((panel) => ({
        title: panel.title,
        labels: panel.tests
            .filter((test) => selected.has(testKey(panel.key, test.key)))
            .map((test) => test.label),
    })).filter((panel) => panel.labels.length > 0);
};

// Igual que groupSelectedTests, pero cada panel devuelto trae TODOS sus
// exámenes con una marca checked. Se usa para imprimir la orden como la hoja
// original: solo las secciones con algo marcado, pero completas, con sus
// casillas llenas y vacías. Devuelve [{ title, tests: [{ label, checked }] }].
export const selectedPanelsWithAllTests = (tests) => {
    const selected = new Set(Array.isArray(tests) ? tests : []);
    return LAB_ORDER_CATALOG.map((panel) => ({
        title: panel.title,
        tests: panel.tests.map((test) => ({
            label: test.label,
            checked: selected.has(testKey(panel.key, test.key)),
        })),
    })).filter((panel) => panel.tests.some((test) => test.checked));
};

export const PREGNANCY_OPTIONS = [
    { value: "", label: "No aplica" },
    { value: "si", label: "Sí" },
    { value: "no", label: "No" },
];

export const ANTIBIOTIC_OPTIONS = [
    { value: "", label: "No indica" },
    { value: "si", label: "Sí" },
    { value: "no", label: "No" },
];
