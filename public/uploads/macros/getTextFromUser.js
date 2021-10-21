var userFeedbacks;

xapi.command("UserInterface Message TextInput Display", {
        Duration: 0,
        FeedbackId: "feedbacks",
        InputType: "SingleLine",
        KeyboardState: "Open",
        Placeholder: "Ecrivez vos commentaires ici",
        SubmitText: "Envoyer",
        Text: "Vos commentaires sont très importants pour nous",
        Title: "Feedback"
      })
      .catch(function(error) {
        console.error(error);
      });

 xapi.event.on("UserInterface Message TextInput Response", function(event) {
    if (event.FeedbackId === "feedbacks") {
      userFeedbacks = event.Text; // <== TEXT ENTRER PAR L'UTILISATEUR
      
       xapi.command("UserInterface Message TextInput Clear", {
        FeedbackId: "feedbacks"
      })
      .catch(function(error) {
        console.error(error);
      });
    }
  });