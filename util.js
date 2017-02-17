//    log : String -> a -> a
/**
 * @description String -> a -> a
 */
exports.log = description => thing => {
    console.log(description, thing);
    return thing;
};